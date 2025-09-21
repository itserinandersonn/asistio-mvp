import Link from 'next/link';
export default function Home() {
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Asistio</h1>
      <p>Go to your inbox:</p>
      <p><Link href="/email">/email</Link></p>
    </div>
  );
}
