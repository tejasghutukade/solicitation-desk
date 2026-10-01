export default function Loading() {
  return (
    <main className="boot">
      <div className="boot-card">
        <h1>Solicitation desk</h1>
        <p className="boot-status" role="status">
          Loading recent solicitations
        </p>
        <p className="boot-note">The daily index is read from DIBBS once, then kept on this machine.</p>
        <div className="boot-track" aria-hidden="true">
          <span className="boot-bar" />
        </div>
      </div>
    </main>
  );
}
