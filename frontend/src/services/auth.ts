import axios from "axios";
import type { User } from "../types";

const AUTH_BASE_URL = "http://localhost:4000/auth";

export async function getCurrentUser(): Promise<User> {
  const response = await axios.get(`${AUTH_BASE_URL}/me`, {
    withCredentials: true,
  });

  return response.data.data;
}

export async function logoutUser(): Promise<void> {
  await axios.post(
    `${AUTH_BASE_URL}/logout`,
    {},
    {
      withCredentials: true,
    }
  );
}