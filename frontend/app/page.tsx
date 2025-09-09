import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  const hasSession = (await cookies()).get("hasSession")?.value === "1";

  if (hasSession) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
