import { ConnectPanel } from './ConnectPanel';

export default function ConnectPage() {
  return (
    <main className="page">
      <h1>Connect AI tools</h1>
      <p className="lede muted">
        Create an MCP token tied to your account, then paste the URL and secret into your client.
      </p>
      <ConnectPanel />
    </main>
  );
}
