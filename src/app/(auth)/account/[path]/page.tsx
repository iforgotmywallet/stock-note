import { AccountView } from "@daveyplate/better-auth-ui"
import { accountViewPaths } from "@daveyplate/better-auth-ui/server"
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "~/lib/auth";
import { BackButton } from "~/components/back-button";


export const dynamicParams = false

export function generateStaticParams() {
    return Object.values(accountViewPaths).map((path) => ({ path }))
}

export default async function AccountPage({ params }: { params: Promise<{ path: string }> }) {
     //Redirect to auth in not signed in
      const session = await auth.api.getSession({
        headers: await headers(),
      });
      if (!session) {
        redirect("/auth/sign-in");
      }
    
    
    const { path } = await params
    return (
        <main className="container p-4 md:p-6">
            {path === "settings" && (
                <div className="mb-6">
                    <BackButton href="/" label="Back to Home" />
                </div>
            )}
            <AccountView path={path} />
        </main>
    )
}

