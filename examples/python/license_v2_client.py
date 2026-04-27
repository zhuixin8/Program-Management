from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import socket
import sys
import time
import urllib.error
import urllib.request
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey


KEYRING_SERVICE = "activation-manager-license-v2"
DEFAULT_BASE_URL = "http://127.0.0.1:3000"


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def sha256_hex(data: bytes | str) -> str:
    if isinstance(data, str):
        data = data.encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def json_bytes(payload: dict[str, Any]) -> bytes:
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def compact(payload: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in payload.items() if value is not None and value != ""}


def identity_digest(base_url: str, project_key: str, machine_id: str) -> str:
    return sha256_hex(f"{base_url.rstrip('/')}|{project_key}|{machine_id}")[:24]


def default_state_file(base_url: str, project_key: str, machine_id: str) -> Path:
    digest = identity_digest(base_url, project_key, machine_id)
    return Path.home() / ".activation-manager" / "license-v2" / f"session-{digest}.json"


def default_key_file(base_url: str, project_key: str, machine_id: str) -> Path:
    digest = identity_digest(base_url, project_key, machine_id)
    return Path.home() / ".activation-manager" / "license-v2" / f"device-{digest}.pem"


class LicenseV2Error(RuntimeError):
    def __init__(
        self,
        message: str,
        *,
        status: int | None = None,
        payload: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.status = status
        self.payload = payload


@dataclass
class LicenseSession:
    sessionId: str
    licenseToken: str
    expiresAt: str | None = None
    deviceId: int | None = None
    offlineLicense: str | None = None
    offlineLicenseExpiresAt: str | None = None
    offlineLicensePublicKey: str | None = None


class DeviceKeyStore:
    def __init__(
        self,
        *,
        base_url: str,
        project_key: str,
        machine_id: str,
        key_file: str | Path | None = None,
        use_keyring: bool = True,
    ) -> None:
        self.identity = identity_digest(base_url, project_key, machine_id)
        self.username = f"device-key-{self.identity}"
        self.key_file = Path(key_file).expanduser() if key_file else default_key_file(
            base_url,
            project_key,
            machine_id,
        )
        self.use_keyring = use_keyring

    def load_or_create(self) -> Ed25519PrivateKey:
        private_key = self._load_from_keyring() or self._load_from_file()
        if private_key:
            return private_key

        private_key = Ed25519PrivateKey.generate()
        pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )
        if not self._save_to_keyring(pem):
            self._save_to_file(pem)
        return private_key

    def _load_from_keyring(self) -> Ed25519PrivateKey | None:
        keyring = self._import_keyring()
        if not keyring:
            return None

        try:
            pem_text = keyring.get_password(KEYRING_SERVICE, self.username)
        except Exception:
            return None

        if not pem_text:
            return None
        return load_private_key(pem_text.encode("utf-8"))

    def _save_to_keyring(self, pem: bytes) -> bool:
        keyring = self._import_keyring()
        if not keyring:
            return False

        try:
            keyring.set_password(KEYRING_SERVICE, self.username, pem.decode("utf-8"))
            return True
        except Exception:
            return False

    def _load_from_file(self) -> Ed25519PrivateKey | None:
        if not self.key_file.exists():
            return None
        return load_private_key(self.key_file.read_bytes())

    def _save_to_file(self, pem: bytes) -> None:
        self.key_file.parent.mkdir(parents=True, exist_ok=True)
        self.key_file.write_bytes(pem)
        try:
            os.chmod(self.key_file, 0o600)
        except OSError:
            pass

    def _import_keyring(self) -> Any | None:
        if not self.use_keyring:
            return None

        try:
            import keyring  # type: ignore
        except Exception:
            return None
        return keyring


def load_private_key(pem: bytes) -> Ed25519PrivateKey:
    key = serialization.load_pem_private_key(pem, password=None)
    if not isinstance(key, Ed25519PrivateKey):
        raise LicenseV2Error("Device private key is not an Ed25519 private key.")
    return key


class LicenseV2Client:
    def __init__(
        self,
        *,
        base_url: str,
        project_key: str,
        machine_id: str,
        app_version: str | None,
        fingerprint_hash: str | None,
        key_store: DeviceKeyStore,
        timeout: float = 10,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.project_key = project_key or "default"
        self.machine_id = machine_id
        self.app_version = app_version
        self.fingerprint_hash = fingerprint_hash
        self.private_key = key_store.load_or_create()
        self.timeout = timeout
        self.session: LicenseSession | None = None

    @property
    def public_key(self) -> str:
        raw_public_key = self.private_key.public_key().public_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PublicFormat.Raw,
        )
        return b64url(raw_public_key)

    def enroll(self, code: str) -> dict[str, Any]:
        device_public_key = self.public_key
        response = self._post_json(
            "/api/license/v2/enroll",
            compact(
                {
                    "projectKey": self.project_key,
                    "code": code,
                    "machineId": self.machine_id,
                    "appVersion": self.app_version,
                    "fingerprintHash": self.fingerprint_hash,
                    "devicePublicKey": device_public_key,
                    "deviceSignature": self.sign_text(
                        self.build_enroll_message(code, device_public_key),
                    ),
                },
            ),
        )
        self._set_session_from_response(response)
        return response

    def challenge(self) -> dict[str, Any]:
        self._require_session()
        assert self.session is not None
        return self._post_json(
            "/api/license/v2/challenge",
            compact(
                {
                    "sessionId": self.session.sessionId,
                    "fingerprintHash": self.fingerprint_hash,
                },
            ),
            headers={"Authorization": f"Bearer {self.session.licenseToken}"},
        )

    def renew(self) -> dict[str, Any]:
        challenge = self.challenge()
        signature = self.sign_text(str(challenge["signInput"]))
        response = self._post_json(
            "/api/license/v2/renew",
            {
                "sessionId": self.session.sessionId,  # type: ignore[union-attr]
                "challengeId": challenge["challengeId"],
                "nonce": challenge["nonce"],
                "signature": signature,
                "fingerprintHash": self.fingerprint_hash,
            },
        )
        self._set_session_from_response(response)
        return response

    def status(self) -> dict[str, Any]:
        return self.signed_post(
            "/api/license/v2/status",
            compact({"fingerprintHash": self.fingerprint_hash}),
        )

    def consume(self, request_id: str | None = None) -> dict[str, Any]:
        return self.signed_post(
            "/api/license/v2/consume",
            compact(
                {
                    "requestId": request_id or f"py_{uuid.uuid4().hex}",
                    "fingerprintHash": self.fingerprint_hash,
                },
            ),
        )

    def offline_status(self, public_key: str | None = None) -> dict[str, Any]:
        self._require_session()
        assert self.session is not None
        if not self.session.offlineLicense:
            raise LicenseV2Error("No offlineLicense saved in the current session.")

        payload = verify_offline_license(
            self.session.offlineLicense,
            public_key or self.session.offlineLicensePublicKey,
        )
        if self.fingerprint_hash and payload.get("fingerprintHash") != self.fingerprint_hash:
            raise LicenseV2Error("offline license fingerprintHash does not match this device.")
        return payload

    def signed_post(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        self._require_session()
        assert self.session is not None

        body = json_bytes(payload)
        timestamp = str(int(time.time()))
        nonce = f"py_{b64url(os.urandom(18))}"
        canonical_message = "\n".join(
            [
                "LICENSE-V2-PROOF",
                "POST",
                path,
                self.session.sessionId,
                timestamp,
                nonce,
                sha256_hex(body),
                sha256_hex(self.session.licenseToken),
            ],
        )

        return self._post_raw(
            path,
            body,
            headers={
                "Authorization": f"Bearer {self.session.licenseToken}",
                "X-License-Session-Id": self.session.sessionId,
                "X-License-Timestamp": timestamp,
                "X-License-Nonce": nonce,
                "X-License-Signature": self.sign_text(canonical_message),
            },
        )

    def sign_text(self, message: str) -> str:
        return b64url(self.private_key.sign(message.encode("utf-8")))

    def build_enroll_message(self, code: str, device_public_key: str) -> str:
        return "\n".join(
            [
                "LICENSE-V2-ENROLL",
                "POST",
                "/api/license/v2/enroll",
                self.project_key,
                code,
                self.machine_id,
                self.app_version or "",
                device_public_key,
                self.fingerprint_hash or "",
            ],
        )

    def save_session(self, state_file: str | Path) -> None:
        self._require_session()
        assert self.session is not None
        path = Path(state_file).expanduser()
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            json.dumps(asdict(self.session), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def load_session(self, state_file: str | Path) -> None:
        path = Path(state_file).expanduser()
        data = json.loads(path.read_text(encoding="utf-8"))
        self.session = LicenseSession(
            sessionId=data["sessionId"],
            licenseToken=data["licenseToken"],
            expiresAt=data.get("expiresAt"),
            deviceId=data.get("deviceId"),
            offlineLicense=data.get("offlineLicense"),
            offlineLicenseExpiresAt=data.get("offlineLicenseExpiresAt"),
            offlineLicensePublicKey=data.get("offlineLicensePublicKey"),
        )

    def _set_session_from_response(self, response: dict[str, Any]) -> None:
        self.session = LicenseSession(
            sessionId=str(response["sessionId"]),
            licenseToken=str(response["licenseToken"]),
            expiresAt=response.get("expiresAt"),
            deviceId=response.get("deviceId"),
            offlineLicense=response.get("offlineLicense"),
            offlineLicenseExpiresAt=response.get("offlineLicenseExpiresAt"),
            offlineLicensePublicKey=response.get("offlineLicensePublicKey"),
        )

    def _require_session(self) -> None:
        if not self.session:
            raise LicenseV2Error("No active License v2 session. Run enroll or load a session first.")

    def _post_json(
        self,
        path: str,
        payload: dict[str, Any],
        *,
        headers: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        return self._post_raw(path, json_bytes(payload), headers=headers)

    def _post_raw(
        self,
        path: str,
        body: bytes,
        *,
        headers: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        request_headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "activation-manager-python-v2/1.0",
            **(headers or {}),
        }
        request = urllib.request.Request(
            f"{self.base_url}{path}",
            data=body,
            headers=request_headers,
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                payload = self._decode_response(response.read())
                if payload.get("success") is False:
                    raise LicenseV2Error(
                        str(payload.get("message") or "License v2 request failed."),
                        status=response.status,
                        payload=payload,
                    )
                return payload
        except urllib.error.HTTPError as error:
            payload = self._decode_response(error.read())
            raise LicenseV2Error(
                str(payload.get("message") or f"HTTP {error.code}"),
                status=error.code,
                payload=payload,
            ) from error

    @staticmethod
    def _decode_response(body: bytes) -> dict[str, Any]:
        if not body:
            return {}
        try:
            decoded = json.loads(body.decode("utf-8"))
        except json.JSONDecodeError as error:
            raise LicenseV2Error("Server returned a non-JSON response.") from error
        if not isinstance(decoded, dict):
            raise LicenseV2Error("Server returned an unexpected JSON response.")
        return decoded


def print_json(payload: dict[str, Any]) -> None:
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def parse_iso8601_utc(value: str) -> float:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()


def verify_offline_license(offline_license: str, public_key: str | None) -> dict[str, Any]:
    if not public_key:
        raise LicenseV2Error("offline license public key is required.")

    try:
        prefix, payload_b64, signature_b64 = offline_license.split(".", 2)
    except ValueError as error:
        raise LicenseV2Error("offline license format is invalid.") from error

    if prefix != "amlic2":
        raise LicenseV2Error("offline license prefix is invalid.")

    payload_bytes = base64.urlsafe_b64decode(payload_b64 + "=" * (-len(payload_b64) % 4))
    signature = base64.urlsafe_b64decode(signature_b64 + "=" * (-len(signature_b64) % 4))
    public_key_bytes = base64.urlsafe_b64decode(public_key + "=" * (-len(public_key) % 4))

    try:
        Ed25519PublicKey.from_public_bytes(public_key_bytes).verify(
            signature,
            payload_b64.encode("ascii"),
        )
    except Exception as error:
        raise LicenseV2Error("offline license signature is invalid.") from error

    payload = json.loads(payload_bytes.decode("utf-8"))
    if payload.get("type") != "activation-manager.offline-license.v2":
        raise LicenseV2Error("offline license payload type is invalid.")
    if parse_iso8601_utc(str(payload["notBefore"])) > time.time():
        raise LicenseV2Error("offline license is not active yet.")
    if parse_iso8601_utc(str(payload["expiresAt"])) <= time.time():
        raise LicenseV2Error("offline license has expired.")
    return payload


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Activation Manager License v2 Python client.")
    parser.add_argument("command", choices=["enroll", "renew", "status", "consume", "offline-status", "demo"])
    parser.add_argument("--base-url", default=os.getenv("LICENSE_V2_BASE_URL", DEFAULT_BASE_URL))
    parser.add_argument("--project-key", default=os.getenv("LICENSE_V2_PROJECT_KEY", "default"))
    parser.add_argument("--code", default=os.getenv("LICENSE_V2_CODE"))
    parser.add_argument(
        "--machine-id",
        default=os.getenv("LICENSE_V2_MACHINE_ID", socket.gethostname()),
    )
    parser.add_argument("--app-version", default=os.getenv("LICENSE_V2_APP_VERSION", "1.0.0"))
    parser.add_argument("--fingerprint-hash", default=os.getenv("LICENSE_V2_FINGERPRINT_HASH"))
    parser.add_argument("--state-file", default=os.getenv("LICENSE_V2_STATE_FILE"))
    parser.add_argument("--key-file", default=os.getenv("LICENSE_V2_KEY_FILE"))
    parser.add_argument("--request-id", default=os.getenv("LICENSE_V2_REQUEST_ID"))
    parser.add_argument("--offline-public-key", default=os.getenv("LICENSE_V2_OFFLINE_PUBLIC_KEY"))
    parser.add_argument("--consume", action="store_true", help="Run consume during the demo command.")
    parser.add_argument("--no-keyring", action="store_true", help="Store the private key in a PEM file.")
    parser.add_argument("--timeout", type=float, default=10)
    return parser


def create_client(args: argparse.Namespace) -> tuple[LicenseV2Client, Path]:
    state_file = (
        Path(args.state_file).expanduser()
        if args.state_file
        else default_state_file(args.base_url, args.project_key, args.machine_id)
    )
    key_store = DeviceKeyStore(
        base_url=args.base_url,
        project_key=args.project_key,
        machine_id=args.machine_id,
        key_file=args.key_file,
        use_keyring=not args.no_keyring,
    )
    return (
        LicenseV2Client(
            base_url=args.base_url,
            project_key=args.project_key,
            machine_id=args.machine_id,
            app_version=args.app_version,
            fingerprint_hash=args.fingerprint_hash,
            key_store=key_store,
            timeout=args.timeout,
        ),
        state_file,
    )


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command in {"enroll", "demo"} and not args.code:
        parser.error("--code is required for enroll and demo.")

    client, state_file = create_client(args)

    try:
        if args.command == "enroll":
            result = client.enroll(args.code)
            client.save_session(state_file)
            print_json(result)
            return 0

        if args.command == "demo":
            result: dict[str, Any] = {
                "enroll": client.enroll(args.code),
                "renew": client.renew(),
                "status": client.status(),
            }
            if args.consume:
                result["consume"] = client.consume(args.request_id)
            client.save_session(state_file)
            print_json(result)
            return 0

        client.load_session(state_file)

        if args.command == "renew":
            result = client.renew()
            client.save_session(state_file)
            print_json(result)
            return 0

        if args.command == "status":
            print_json(client.status())
            return 0

        if args.command == "consume":
            print_json(client.consume(args.request_id))
            return 0

        if args.command == "offline-status":
            print_json(client.offline_status(args.offline_public_key))
            return 0
    except LicenseV2Error as error:
        print(f"License v2 error: {error}", file=sys.stderr)
        if error.payload:
            print_json(error.payload)
        return 1

    parser.error(f"Unsupported command: {args.command}")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
