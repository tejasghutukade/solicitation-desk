import { DeskScreen } from "@/components/desk-screen";
import { loadIndexOnStartup } from "@/lib/desk/app";
import { openingQuery } from "@/lib/desk/types";

export default async function Page() {
  const startup = await loadIndexOnStartup();
  if (!startup.ok) {
    return (
      <main className="desk-message">
        <h1>Solicitation desk</h1>
        <p className="is-fail">{startup.message}</p>
      </main>
    );
  }

  return <DeskScreen initialQuery={openingQuery("hardware")} />;
}
