import os

# Correct pattern: read the secret from the environment, never hardcode it.
API_TOKEN = os.environ.get("API_TOKEN")

def main():
    if not API_TOKEN:
        raise SystemExit("set API_TOKEN in your environment")
    print("running with token from env")

if __name__ == "__main__":
    main()
