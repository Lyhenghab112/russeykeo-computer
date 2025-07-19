from werkzeug.security import generate_password_hash
import sys

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python generate_password_hash.py <123456789>")
        sys.exit(1)

    plaintext_password = sys.argv[1]
    hashed_password = generate_password_hash(plaintext_password)
    print(f"Plaintext Password: {plaintext_password}")
    print(f"Hashed Password: {hashed_password}")
