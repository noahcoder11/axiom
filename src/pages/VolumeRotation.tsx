import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import VolumeRotationWidget from '../components/VolumeRotationWidget';

export default function VolumeRotation() {
  return (
    <>
      <Navbar showBack />

      <main className="container" style={{ paddingTop: 'var(--space-2xl)', minHeight: '80vh' }}>
        {/* --- HEADER --- */}
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="hero__eyebrow">Calculus</div>
          <h1 style={{ fontSize: '32px', marginBottom: '8px', letterSpacing: '-0.02em' }}>
            Volume by Rotation (Solids of Revolution)
          </h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Rotate a 2D mathematical curve around an axis to generate a 3D solid of revolution, and estimate its volume using the disk or shell method.
          </p>
        </div>

        <VolumeRotationWidget />
      </main>

      <Footer />
    </>
  );
}
