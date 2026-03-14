import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
	email: EmailStr
	password: str = Field(min_length=8, max_length=128)
	full_name: str | None = Field(default=None, max_length=255)

	@field_validator("email", mode="before")
	@classmethod
	def normalise_email(cls, v: str) -> str:
		return v.strip().lower()

	@field_validator("password")
	@classmethod
	def password_not_whitespace(cls, v: str) -> str:
		if v.strip() == "":
			raise ValueError("Password must not be blank or whitespace only")
		return v

	@field_validator("full_name", mode="before")
	@classmethod
	def strip_name(cls, v: str | None) -> str | None:
		return v.strip() or None if v else None


class LoginRequest(BaseModel):
	email: EmailStr
	password: str = Field(min_length=8, max_length=128)

	@field_validator("email", mode="before")
	@classmethod
	def normalise_email(cls, v: str) -> str:
		return v.strip().lower()


class GoogleLoginRequest(BaseModel):
	id_token: str = Field(min_length=20)


class TokenResponse(BaseModel):
	access_token: str
	token_type: str = "bearer"


class UserResponse(BaseModel):
	model_config = ConfigDict(from_attributes=True)

	id: uuid.UUID
	email: EmailStr
	full_name: str | None = None
	created_at: datetime

