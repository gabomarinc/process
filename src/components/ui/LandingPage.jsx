import React, { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import './LandingPage.css';

export function LandingPage({ onLoginClick, onStartFree }) {
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email.trim()) {
      onStartFree(email);
    }
  };

  return (
    <div className="landing-container">
      {/* Header */}
      <header className="landing-header">
        <img 
          src="https://konsul.digital/images/Konsul-logo-original-blanco.png" 
          alt="Kônsul Logo" 
          className="landing-logo" 
        />
        <button className="btn-login" onClick={onLoginClick}>
          Iniciar Sesión
        </button>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <h1 className="hero-title">
          Automatiza tus procesos <br />
          <span>y orquesta tu equipo</span> <br />
          desde Kônsul
        </h1>
        <p className="hero-subtitle">
          Crea tus plantillas de procesos de negocio, asigna tareas a tu equipo de trabajo y automatiza las ejecuciones en segundo plano de manera estructurada y 100% personalizada.
        </p>

        {/* Content Wrapper (with floating cards and form) */}
        <div className="hero-content-wrapper">
          {/* Green Curved Arrow pointing to the form */}
          <svg className="hero-curved-arrow" viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10,65 Q35,15 75,40" stroke="#27bea7" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M63,38 L75,40 L70,49" stroke="#27bea7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>

          {/* Floating Card Left */}
          <div className="floating-card left">
            <span className="card-badge">
              <span className="dot-pulse" /> Prueba Gratuita
            </span>
            <h3 className="card-title">Empieza con 10 procesos gratis</h3>
            <p className="card-body">
              Visualiza y controla al instante. Sin registros complejos ni tarjeta.
            </p>
            <span className="card-link" onClick={onLoginClick}>¿Ya tienes Pro? Entrar</span>
          </div>

          {/* Center Form Card */}
          <div className="hero-form-card" style={{ position: 'relative' }}>
            {/* Rotating circular badge next to form */}
            <div className="rotating-badge-container">
              <svg className="rotating-sticker" viewBox="0 0 100 100">
                <path id="circlePath" d="M 50, 50 m -35, 0 a 35,35 0 1,1 70,0 a 35,35 0 1,1 -70,0" fill="none" />
                <text fill="#27bea7" fontSize="6.5" fontWeight="bold" letterSpacing="1.8">
                  <textPath href="#circlePath">
                    KÔNSUL PROCESS • GRATIS • PRUÉBALO • 
                  </textPath>
                </text>
              </svg>
            </div>

            <h2 className="form-card-title">PRUÉBALO GRATIS</h2>
            <p className="form-card-subtitle">Ingresa tu correo para probar la herramienta gratis.</p>
            
            <form onSubmit={handleSubmit} className="hero-form">
              <label>Correo Electrónico</label>
              <input 
                type="email" 
                placeholder="tucorreo@ejemplo.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" className="btn-submit-hero">
                🚀 Comenzar Ahora Mismo
              </button>
            </form>

            <p className="form-switch-link">
              ¿Ya tienes cuenta Pro? <span onClick={onLoginClick}>Inicia Sesión</span>
            </p>

            <div className="rating-block">
              <div className="rating-avatars">
                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" alt="User 1" />
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80" alt="User 2" />
                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80" alt="User 3" />
                <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80" alt="User 4" />
                <img src="https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=100&q=80" alt="User 5" />
              </div>
              <span className="rating-text">4.5/5 ⭐⭐⭐⭐⭐ DE SATISFACCIÓN EN NUESTROS CLIENTES</span>
            </div>
          </div>

          {/* Floating Card Right */}
          <div className="floating-card right">
            <span className="card-badge" style={{ background: 'rgba(39,190,167,0.1)', color: '#27bea7' }}>100% Control</span>
            <h3 className="card-title">100% Efectividad</h3>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', margin: '0.75rem 0', overflow: 'hidden' }}>
              <div style={{ width: '100%', height: '100%', background: '#27bea7' }} />
            </div>
            <p className="card-body" style={{ margin: 0 }}>
              Consola Kônsul Process. Tareas dinámicas inteligentes.
            </p>
          </div>
        </div>

        {/* Stats Pills */}
        <div className="stats-pills-container">
          <div className="stats-pill">
            <span>Empresas Activas</span>
            <strong>+10</strong>
          </div>
          <div className="stats-pill">
            <span>Procesos Completados</span>
            <strong>+5,000</strong>
          </div>
        </div>
      </section>

      {/* Middle Section */}
      <section className="landing-middle">
        <span className="middle-pretitle">Acceso Ilimitado</span>
        <h2 className="middle-title">UN SOLO PAGO. VALOR PARA SIEMPRE.</h2>

        {/* Pricing Card */}
        <div className="pricing-card">
          <span className="popular-badge">MÁS POPULAR</span>
          <span className="pricing-license">Licencia Lifetime</span>
          <h3 className="pricing-amount">$49 <span>USD</span></h3>
          <p className="pricing-desc">
            Pago único. Crea procesos ilimitados de negocio, asigna tareas a tu equipo y optimiza la productividad de tu empresa para siempre.
          </p>
          <button className="btn-pricing" onClick={onLoginClick}>
            Empezar Ahora
          </button>
        </div>

        {/* Detail/Feature Cards Wrapper with Connecting Arrows */}
        <div className="features-grid-wrapper">
          <div className="features-grid">
            {/* Card 1 */}
            <div className="feature-card">
              <div>
                <span className="feature-num">01 • VELOCIDAD</span>
                <h4 className="feature-title">DE 0 A 100 EN SEGUNDOS</h4>
                <p className="feature-desc">
                  Crea plantillas de procesos a partir de tus flujos de trabajo y pon a correr tareas asignadas al instante de forma estructurada.
                </p>
              </div>
              <div className="mini-graphic" style={{ fontSize: '0.7rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#1e293b', padding: '4px 8px', borderRadius: '4px' }}>
                  <Check size={12} style={{ color: '#27bea7' }} />
                  <span>Plantilla.json</span>
                </div>
                <span style={{ color: '#27bea7', fontWeight: 700 }}>100 Tareas</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="feature-card">
              <div>
                <span className="feature-num">02 • PERSONALIZACIÓN</span>
                <h4 className="feature-title">PASOS CON TEXTOS DINÁMICOS</h4>
                <p className="feature-desc">
                  Utiliza variables en la descripción de tus pasos para que cada tarea asignada sea única, contextual y relevante para tus agentes.
                </p>
              </div>
              <div className="mini-graphic pill" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7rem' }}>
                <span style={{ color: '#94a3b8' }}>Paso:</span>
                <span>[Nombre de Tarea]</span>
                <span style={{ background: '#27bea7', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', padding: '2px', color: '#ffffff' }}>
                  <ArrowRight size={10} />
                </span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="feature-card">
              <div>
                <span className="feature-num">03 • SEGURIDAD</span>
                <h4 className="feature-title">MÁXIMO CONTROL DE FLUJOS</h4>
                <p className="feature-desc">
                  Visualiza el estado de cada ejecución en tiempo real mediante nuestro panel inteligente para mitigar cuellos de botella.
                </p>
              </div>
              <div className="mini-graphic badge" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span className="dot-pulse" style={{ backgroundColor: '#ffffff' }} />
                <span>Estado: Seguro & Activo</span>
              </div>
            </div>
          </div>

          {/* Connecting Arrow 1 */}
          <svg className="connecting-arrow arrow-1" viewBox="0 0 60 30" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5,5 Q30,25 55,5" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M48,5 L55,5 L52,12" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
          {/* Connecting Arrow 2 */}
          <svg className="connecting-arrow arrow-2" viewBox="0 0 60 30" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5,5 Q30,25 55,5" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M48,5 L55,5 L52,12" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </div>
      </section>

      {/* Footer (Identical to the image) */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <img 
              src="https://konsul.digital/images/Konsul-logo-original-blanco.png" 
              alt="Kônsul Logo" 
              className="footer-logo" 
              style={{ filter: 'brightness(0) saturate(100%) invert(14%) sepia(16%) saturate(1750%) hue-rotate(182deg) brightness(97%) contrast(92%)' }} 
            />
            <p className="footer-desc">
              Somos una casa productora de tecnología que crea soluciones a la medida y llave en mano, para automatizar tus procesos comerciales. Hacemos que la inteligencia artificial trabaje en segundo plano mientras tú dominas tu industria.
            </p>
          </div>
          
          <div className="footer-col">
            <h4>Nuestra Agencia</h4>
            <ul className="footer-links">
              <li><a href="https://konsul.digital" target="_blank" rel="noopener noreferrer">Kônsul Digital</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Nuestras Herramientas</h4>
            <ul className="footer-links">
              <li><a href="#process">Process by Kônsul</a></li>
              <li><a href="#bills">Bills by Kônsul</a></li>
              <li><a href="#kredit">Kredit by Kônsul</a></li>
              <li><a href="#leadshub">LeadsHUB</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Reactivaleads</h4>
            <ul className="footer-links">
              <li><a href="#automatizacion">Automatización de Ventas</a></li>
              <li><a href="#whatsapp">Seguimiento por WhatsApp</a></li>
              <li><a href="#gestion">Gestión de Leads</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 ReactiveLeads by Kônsul. Todos los derechos reservados.</span>
          <span>Made with ❤️ by Kônsul Digital</span>
        </div>
      </footer>
    </div>
  );
}
