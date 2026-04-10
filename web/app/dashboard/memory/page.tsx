import { MemoryExplorer } from './MemoryExplorer';
import { PostgresMemoryPreview } from './PostgresMemoryPreview';

export default function MemoryPage() {
  return (
    <main className="page">
      <h1>Memory files</h1>
      <p className="lede muted">
        View recent rows from <code className="inline">memory_entries</code> (decrypted on the server
        with <code className="inline">MEMORY_ENCRYPTION_KEY</code>) and human-readable markdown synced
        to Storage by the MCP server.
      </p>

      <h2 className="section-title">Recent memories (Postgres)</h2>
      <p className="muted small">
        Same ciphertext the MCP tools read; requires web env <code className="inline">MEMORY_ENCRYPTION_KEY</code>{' '}
        matching Railway / local <code className="inline">mcp-server</code>.
      </p>
      <PostgresMemoryPreview />

      <h2 className="section-title">Storage markdown</h2>
      <p className="muted small">
        Requires bucket <code className="inline">user-memory</code> and{' '}
        <code className="inline">003_storage_rls_user_memory.sql</code>.
      </p>
      <MemoryExplorer />
    </main>
  );
}
