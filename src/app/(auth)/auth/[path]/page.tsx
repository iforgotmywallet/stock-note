import { AuthView } from "@daveyplate/better-auth-ui";
import { IconStackMiddle } from "@tabler/icons-react";

// Force dynamic rendering to avoid static generation issues
export const dynamic = "force-dynamic";

interface AuthPageProps {
  params: Promise<{ path: string }>;
}

export default async function AuthPage({ params }: AuthPageProps) {
  const { path } = await params;

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a
          href="#"
          className="flex items-center gap-2 self-center font-semibold"
        >
          <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
            <IconStackMiddle className="size-4" />
          </div>
          StockNotes
        </a>
        <AuthView path={path} />
      </div>
    </div>
  );
}
