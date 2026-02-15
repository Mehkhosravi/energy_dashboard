from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "profghadri"
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "energy_data"

    class Config:
        env_file = ".env"

settings = Settings()
