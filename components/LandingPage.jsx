"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  const [emailInput, setEmailInput] = useState("");
  const [showVideoModal, setShowVideoModal] = useState(false);
  const trackRef = useRef(null);
  const statsGridRef = useRef(null);

  // Testimonials data
  const quotes = [
    ["Landed my PM internship after two weeks of mock rounds here.", "Ananya S.", "Final year, IIT"],
    ["The competitions are the real deal — actual recruiters look at the leaderboard.", "Rohit V.", "CS student"],
    ["Streaks kept me consistent in a way no other app did.", "Meera K.", "MBA candidate"],
    ["Feedback after each mock interview is scarily accurate.", "Devansh P.", "Engineering, 3rd yr"],
    ["Went from 0 interviews to 3 offers in a semester.", "Priya R.", "Design student"],
  ];

  useEffect(() => {
    // Smooth scroll fade-in / fade-out listener
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const elements = document.querySelectorAll(".scroll-fade");
          const windowHeight = window.innerHeight;
          
          elements.forEach((el) => {
            const rect = el.getBoundingClientRect();
            const entryDistance = windowHeight - rect.top;
            const exitDistance = rect.bottom;
            
            let opacity = 1;
            let translateY = 0;
            let scale = 1;
            const fadeDistance = 220; // range of pixels over which opacity/translate change
            
            if (entryDistance < 0) {
              opacity = 0;
              translateY = 40;
              scale = 0.96;
            } else if (entryDistance < fadeDistance) {
              const ratio = entryDistance / fadeDistance;
              opacity = ratio;
              translateY = 40 * (1 - ratio);
              scale = 0.96 + 0.04 * ratio;
            } else if (exitDistance < 0) {
              opacity = 0;
              translateY = -40;
              scale = 0.96;
            } else if (exitDistance < fadeDistance) {
              const ratio = exitDistance / fadeDistance;
              opacity = ratio;
              translateY = -40 * (1 - ratio);
              scale = 0.96 + 0.04 * ratio;
            } else {
              opacity = 1;
              translateY = 0;
              scale = 1;
            }
            
            el.style.opacity = opacity;
            el.style.transform = `translateY(${translateY}px) scale(${scale}) translateZ(0)`;
          });
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Initial call to position elements
    setTimeout(handleScroll, 100);

    // Count up animation
    function countUp(el, target) {
      const t0 = performance.now(),
        dur = 1200;
      function f(t) {
        const p = Math.min((t - t0) / dur, 1);
        const e = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.floor(e * target).toLocaleString();
        if (p < 1) requestAnimationFrame(f);
        else el.textContent = target.toLocaleString();
      }
      requestAnimationFrame(f);
    }

    const cIo = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            countUp(e.target, +e.target.dataset.count);
            cIo.unobserve(e.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    document.querySelectorAll("[data-count]").forEach((c) => cIo.observe(c));

    return () => {
      window.removeEventListener("scroll", handleScroll);
      cIo.disconnect();
    };
  }, []);

  const handleGetStarted = (e) => {
    e.preventDefault();
    if (emailInput.trim()) {
      router.push(`/sign-in?email=${encodeURIComponent(emailInput)}`);
    } else {
      router.push("/sign-in");
    }
  };

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            :root {
              --bg: #07070a;
              --surface: #111116;
              --surface-2: #191922;
              --border: #26262f;
              --violet: #8b5cf6;
              --indigo: #6366f1;
              --mint: #7CFFC4;
              --gold: #fbbf6a;
              --text: #f4f3f9;
              --text-dim: #9997ab;
              --text-faint: #5c5a6e;
            }
            .landing-body {
              background: var(--bg);
              color: var(--text);
              font-family: inherit;
              overflow-x: hidden;
              position: relative;
              min-height: 100vh;
            }
            .landing-body::before {
              content: "";
              position: fixed;
              top: -25%;
              left: 50%;
              width: 1300px;
              height: 1300px;
              transform: translateX(-50%);
              background: radial-gradient(circle, rgba(139,92,246,.16) 0%, rgba(139,92,246,0) 60%);
              z-index: 0;
              pointer-events: none;
              animation: drift 16s ease-in-out infinite alternate;
            }
            @keyframes drift {
              0% { transform: translateX(-52%); }
              100% { transform: translateX(-48%) translateY(50px); }
            }
            .noise {
              position: fixed;
              inset: 0;
              z-index: 0;
              opacity: .025;
              pointer-events: none;
              background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
            }
            .wrap {
              max-width: 1360px;
              margin: 0 auto;
              padding: 0 48px;
              position: relative;
              z-index: 1;
            }
            /* NAV */
            nav.landing-nav {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 24px 48px;
              max-width: 1360px;
              margin: 0 auto;
              position: relative;
              z-index: 5;
            }
            .logo {
              display: flex;
              align-items: center;
              gap: 9px;
              font-weight: 800;
              font-size: 20px;
            }
            .logo-mark {
              width: 28px;
              height: 28px;
              border-radius: 8px;
              background: #000;
              border: 1px solid var(--border);
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
              font-size: 12px;
              color: var(--mint);
            }
            .logo-mark span.cur {
              display: inline-block;
              width: 5px;
              height: 11px;
              background: var(--mint);
              margin-left: 1px;
              animation: blink 1s steps(1) infinite;
            }
            @keyframes blink {
              50% { opacity: 0; }
            }
            .nav-links {
              display: flex;
              gap: 32px;
              font-size: 14.5px;
              color: var(--text-dim);
            }
            .nav-links a {
              transition: color 0.25s ease;
            }
            .nav-links a:hover {
              color: var(--text);
            }
            .nav-actions {
              display: flex;
              gap: 12px;
              align-items: center;
            }
            .btn-text {
              font-size: 14px;
              font-weight: 600;
              color: var(--text-dim);
              padding: 9px 14px;
              cursor: pointer;
              transition: color 0.25s ease;
            }
            .btn-text:hover {
              color: var(--text);
            }
            .btn-pill {
              background: var(--surface-2);
              border: 1px solid var(--border);
              color: var(--text);
              padding: 9px 18px;
              border-radius: 100px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              transition: .25s;
            }
            .btn-pill:hover {
              border-color: var(--violet);
              transform: translateY(-1px);
            }
            .btn-solid {
              background: linear-gradient(135deg, var(--violet), var(--indigo));
              border: none;
              color: #fff;
              padding: 10px 20px;
              border-radius: 100px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              transition: transform 0.2s ease, box-shadow 0.2s ease;
            }
            .btn-solid:hover {
              transform: translateY(-1px);
              box-shadow: 0 4px 12px rgba(139, 92, 246, 0.25);
            }
            /* HERO */
            .hero {
              text-align: center;
              padding: 120px 48px 0;
              position: relative;
              z-index: 1;
            }
            .eyebrow {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
              font-size: 12px;
              letter-spacing: .06em;
              text-transform: uppercase;
              color: var(--mint);
              background: rgba(124,255,196,.08);
              border: 1px solid rgba(124,255,196,.25);
              padding: 8px 16px;
              border-radius: 100px;
              margin-bottom: 28px;
              opacity: 0;
              animation: fadeUp .7s ease forwards .1s;
            }
            .eyebrow .dot {
              width: 6px;
              height: 6px;
              border-radius: 50%;
              background: var(--mint);
              animation: pulse 2s infinite;
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: .3; }
            }
            h1.hero-title {
              font-weight: 850;
              font-size: clamp(40px, 7vw, 76px);
              line-height: 1.05;
              letter-spacing: -0.03em;
              max-width: 920px;
              margin: 0 auto;
              opacity: 0;
              animation: fadeUp .8s ease forwards .22s;
            }
            h1.hero-title .grad {
              background: linear-gradient(100deg, var(--violet), var(--indigo) 45%, var(--mint));
              background-size: 200% auto;
              -webkit-background-clip: text;
              background-clip: text;
              color: transparent;
              animation: shine 6s linear infinite;
            }
            @keyframes shine {
              to { background-position: 200% center; }
            }
            .hero-sub {
              max-width: 620px;
              margin: 24px auto 0;
              color: var(--text-dim);
              font-size: 18px;
              line-height: 1.65;
              opacity: 0;
              animation: fadeUp .8s ease forwards .36s;
            }
            .hero-actions {
              display: flex;
              gap: 16px;
              justify-content: center;
              margin-top: 36px;
              opacity: 0;
              animation: fadeUp .8s ease forwards .5s;
            }
            .btn-primary {
              background: linear-gradient(135deg, var(--violet), var(--indigo));
              color: #fff;
              border: none;
              padding: 14px 30px;
              border-radius: 12px;
              font-weight: 600;
              font-size: 15px;
              cursor: pointer;
              transition: box-shadow .3s, transform .2s;
            }
            .btn-primary:hover {
              box-shadow: 0 10px 32px rgba(139,92,246,.45);
              transform: translateY(-2px);
            }
            .btn-ghost {
              background: transparent;
              border: 1px solid var(--border);
              color: var(--text);
              padding: 14px 28px;
              border-radius: 12px;
              font-weight: 600;
              font-size: 15px;
              cursor: pointer;
              transition: .25s;
            }
            .btn-ghost:hover {
              border-color: var(--violet);
              background: rgba(139,92,246,.06);
            }
            @keyframes fadeUp {
              from { opacity: 0; transform: translateY(16px); }
              to { opacity: 1; transform: translateY(0); }
            }
            /* HERO MOCKUP - main browser frame */
            .hero-mockup-wrap {
              margin-top: 72px;
              perspective: 1600px;
              opacity: 0;
              animation: fadeUp 1s ease forwards .64s;
            }
            .browser-frame {
              max-width: 1080px;
              margin: 0 auto;
              background: var(--surface);
              border: 1px solid var(--border);
              border-radius: 16px 16px 0 0;
              overflow: hidden;
              box-shadow: 0 40px 100px rgba(0,0,0,.55);
              transform: rotateX(4deg);
              transform-origin: bottom center;
              transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.5s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .browser-frame:hover {
              transform: rotateX(0deg) translateY(-8px);
              box-shadow: 0 50px 120px rgba(139,92,246,.15), 0 10px 30px rgba(0,0,0,.5);
            }
            .browser-bar {
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 12px 18px;
              background: var(--surface-2);
              border-bottom: 1px solid var(--border);
            }
            .browser-bar .d {
              width: 10px;
              height: 10px;
              border-radius: 50%;
            }
            .browser-bar .d:nth-child(1) { background: #ff5f57; }
            .browser-bar .d:nth-child(2) { background: #febc2e; }
            .browser-bar .d:nth-child(3) { background: #28c840; }
            .browser-bar .url {
              margin: 0 auto;
              background: var(--bg);
              border: 1px solid var(--border);
              border-radius: 100px;
              padding: 5px 20px;
              font-size: 12px;
              color: var(--text-faint);
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            }
            .browser-body {
              max-height: 580px;
              background: #07070a;
              position: relative;
              overflow: hidden;
            }
            .browser-body img {
              width: 100%;
              height: auto;
              display: block;
              transition: transform 4.5s cubic-bezier(0.4, 0, 0.2, 1);
              transform: translateY(0);
            }
            .browser-frame:hover .browser-body img {
              transform: translateY(calc(-100% + 100%));
            }
            .ph-fill {
              position: absolute;
              inset: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-direction: column;
              gap: 10px;
              background-size: cover;
              background-position: center;
            }
            .ph-fill .ph-label {
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
              font-size: 11px;
              color: var(--text-faint);
              border: 1px dashed var(--border);
              padding: 8px 16px;
              border-radius: 8px;
            }
            .ph-glow1 {
              background: radial-gradient(circle at 30% 20%, rgba(139,92,246,.25), transparent 60%), radial-gradient(circle at 80% 80%, rgba(124,255,196,.12), transparent 55%);
            }
            /* TRUSTED BAR */
            .trusted {
              padding: 80px 0 20px;
              text-align: center;
            }
            .trusted p {
              font-size: 12.5px;
              color: var(--text-faint);
              letter-spacing: .08em;
              text-transform: uppercase;
              margin-bottom: 32px;
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            }
            .logo-row {
              display: flex;
              justify-content: center;
              align-items: center;
              gap: 64px;
              flex-wrap: wrap;
              opacity: .6;
              filter: grayscale(1);
            }
            .logo-row span {
              font-weight: 750;
              font-size: 20px;
              color: var(--text-dim);
              transition: color 0.3s ease, opacity 0.3s ease;
            }
            .logo-row span:hover {
              color: var(--text);
              opacity: 1;
            }
            /* SECTION generic */
            .section {
              padding: 140px 0;
              position: relative;
              z-index: 1;
              border-bottom: 1px solid rgba(255, 255, 255, 0.03);
            }
            .section-tag {
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
              font-size: 12px;
              color: var(--mint);
              text-transform: uppercase;
              letter-spacing: .08em;
              margin-bottom: 18px;
            }
            .section-title {
              font-weight: 800;
              font-size: clamp(32px, 4.5vw, 48px);
              letter-spacing: -0.02em;
              line-height: 1.15;
              max-width: 780px;
            }
            .section-sub {
              color: var(--text-dim);
              font-size: 17px;
              max-width: 580px;
              margin-top: 18px;
              line-height: 1.65;
            }
            .feature-row {
              display: flex;
              align-items: center;
              gap: 96px;
              margin-top: 180px;
              transition: transform 0.5s ease;
            }
            .feature-row.rev {
              flex-direction: row-reverse;
            }
            .feature-text {
              flex: 1;
              max-width: 520px;
            }
            .feature-text h3 {
              font-weight: 800;
              font-size: 28px;
              margin-bottom: 16px;
              letter-spacing: -0.01em;
            }
            .feature-text p {
              color: var(--text-dim);
              font-size: 15.5px;
              line-height: 1.7;
              margin-bottom: 24px;
            }
            .feature-list {
              display: flex;
              flex-direction: column;
              gap: 12px;
            }
            .feature-list li {
              list-style: none;
              display: flex;
              gap: 12px;
              align-items: flex-start;
              font-size: 14.5px;
              color: var(--text-dim);
            }
            .feature-list svg {
              width: 16px;
              height: 16px;
              stroke: var(--mint);
              flex-shrink: 0;
              margin-top: 3px;
            }
            .feature-mock {
              flex: 1.2;
              min-width: 0;
            }
            .mini-frame {
              background: var(--surface);
              border: 1px solid var(--border);
              border-radius: 14px;
              overflow: hidden;
              box-shadow: 0 30px 70px rgba(0,0,0,.45);
              transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.5s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.5s ease;
              will-change: transform, box-shadow;
            }
            .mini-frame:hover {
              transform: translateY(-8px) scale(1.02);
              box-shadow: 0 40px 80px rgba(139, 92, 246, 0.16), 0 10px 30px rgba(0,0,0,0.5);
              border-color: var(--violet);
            }
            .mini-bar {
              display: flex;
              gap: 6px;
              padding: 10px 14px;
              background: var(--surface-2);
              border-bottom: 1px solid var(--border);
            }
            .mini-bar .d {
              width: 8px;
              height: 8px;
              border-radius: 50%;
            }
            .mini-bar .d:nth-child(1) { background: #ff5f57; }
            .mini-bar .d:nth-child(2) { background: #febc2e; }
            .mini-bar .d:nth-child(3) { background: #28c840; }
            .mini-body {
              aspect-ratio: 16/9.2;
              background: #07070a;
              position: relative;
              overflow: hidden;
            }
            .mini-body img {
              width: 100%;
              height: auto;
              position: absolute;
              top: 0;
              left: 0;
              display: block;
              transition: transform 3.5s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .mini-frame:hover .mini-body img {
              transform: translateY(calc(-100% + 100%));
            }
            /* scroll fade styling */
            .scroll-fade {
              opacity: 0;
              transform: translateY(30px);
              transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
              will-change: opacity, transform;
            }
            /* STATS */
            .stats-band {
              margin-top: 160px;
              background: var(--surface);
              border-top: 1px solid var(--border);
              border-bottom: 1px solid var(--border);
              padding: 72px 0;
            }
            .stats-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              text-align: center;
            }
            @media (max-width: 800px) {
              .stats-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 40px;
              }
            }
            .stats-grid b {
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
              font-size: 44px;
              font-weight: 700;
              display: block;
              background: linear-gradient(100deg, var(--violet), var(--mint));
              -webkit-background-clip: text;
              background-clip: text;
              color: transparent;
            }
            .stats-grid span {
              font-size: 14px;
              color: var(--text-dim);
              margin-top: 8px;
              display: block;
            }
            /* TESTIMONIAL / MARQUEE */
            .quote-marquee {
              margin-top: 160px;
              overflow: hidden;
              white-space: nowrap;
            }
            .qtrack {
              display: inline-flex;
              gap: 24px;
              animation: qscroll 34s linear infinite;
            }
            @keyframes qscroll {
              from { transform: translateX(0); }
              to { transform: translateX(-50%); }
            }
            .qcard {
              display: inline-flex;
              flex-direction: column;
              gap: 16px;
              width: 340px;
              white-space: normal;
              background: var(--surface);
              border: 1px solid var(--border);
              border-radius: 16px;
              padding: 24px;
            }
            .qcard p {
              font-size: 14px;
              color: var(--text-dim);
              line-height: 1.65;
            }
            .qcard .who {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .qcard .avatar {
              width: 36px;
              height: 36px;
              border-radius: 50%;
              background: linear-gradient(135deg, var(--violet), var(--indigo));
              flex-shrink: 0;
            }
            .qcard .who b {
              font-size: 13.5px;
              display: block;
            }
            .qcard .who span {
              font-size: 12px;
              color: var(--text-faint);
            }
            /* FINAL CTA */
            .final-cta {
              margin: 160px 0 0;
              text-align: center;
              padding: 120px 48px;
              background: radial-gradient(ellipse at center top, rgba(139,92,246,.14), transparent 65%);
              border-top: 1px solid var(--border);
            }
            .final-cta h2 {
              font-weight: 850;
              font-size: clamp(34px, 5vw, 54px);
              letter-spacing: -0.02em;
              margin-bottom: 20px;
            }
            .final-cta p {
              color: var(--text-dim);
              font-size: 17px;
              margin-bottom: 36px;
            }
            .cta-box {
              max-width: 460px;
              margin: 0 auto;
              display: flex;
              gap: 8px;
              background: var(--surface);
              border: 1px solid var(--border);
              padding: 6px;
              border-radius: 100px;
              transition: border-color 0.3s ease;
            }
            .cta-box:focus-within {
              border-color: var(--violet);
            }
            .cta-box input {
              flex-grow: 1;
              background: transparent;
              border: none;
              outline: none;
              color: var(--text);
              padding: 12px 20px;
              font-size: 14.5px;
            }
            .cta-box input::placeholder {
              color: var(--text-faint);
            }
            .cta-box button {
              background: linear-gradient(135deg, var(--violet), var(--indigo));
              border: none;
              color: #fff;
              font-weight: 600;
              font-size: 14px;
              padding: 12px 24px;
              border-radius: 100px;
              cursor: pointer;
              white-space: nowrap;
              transition: transform 0.2s ease;
            }
            .cta-box button:hover {
              transform: scale(1.02);
            }
            .landing-footer {
              margin-top: 100px;
              border-top: 1px solid var(--border);
              padding: 60px 48px 48px;
              text-align: center;
              color: var(--text-faint);
              font-size: 13.5px;
            }
            .landing-footer .flinks {
              display: flex;
              justify-content: center;
              gap: 32px;
              margin-bottom: 28px;
              font-size: 14px;
              color: var(--text-dim);
              flex-wrap: wrap;
            }
            .landing-footer .flinks a {
              transition: color 0.25s ease;
            }
            .landing-footer .flinks a:hover {
              color: var(--text);
            }
            @media (max-width: 960px) {
              .feature-row, .feature-row.rev {
                flex-direction: column;
                gap: 48px;
                margin-top: 100px;
              }
              .feature-text {
                max-width: 100%;
              }
              .nav-links {
                display: none;
              }
              .wrap {
                padding: 0 24px;
              }
              nav.landing-nav {
                padding: 22px 24px;
              }
              .hero {
                padding: 80px 24px 0;
              }
            }
          `,
        }}
      />

      <div className="landing-body">
        <div className="noise" />

        <nav className="landing-nav">
          <div className="logo">
            <img src="/logo_icon.png" alt="logo" style={{ height: "32px", width: "auto", objectFit: "contain" }} />
            PrepWise
          </div>
          <div className="nav-links">
            <a href="#features">Product</a>
            <a href="#showcase">Showcase</a>
            <a href="#testimonials">Community</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div className="nav-actions">
            <Link href="/sign-in" className="btn-text">
              Log in
            </Link>
            <Link href="/sign-in" className="btn-solid">
              Get started free
            </Link>
          </div>
        </nav>

        <section className="hero scroll-fade">
          <div className="eyebrow">
            <span className="dot" /> Now with AI mock interview feedback
          </div>
          <h1 className="hero-title">
            The platform that gets you <span className="grad">hired.</span>
          </h1>
          <p className="hero-sub">
            Practice real interviews, enter live competitions, and land internships — all in one place built for students who mean business.
          </p>
          <div className="hero-actions">
            <Link href="/sign-in" className="btn-primary">
              Get started — it's free
            </Link>
            <button onClick={() => setShowVideoModal(true)} className="btn-ghost">▶ Watch 60s demo</button>
          </div>

          <div className="hero-mockup-wrap">
            <div className="browser-frame">
              <div className="browser-bar">
                <span className="d" />
                <span className="d" />
                <span className="d" />
                <span className="url">app.prepwise.com/home</span>
              </div>
              <div className="browser-body">
                <img
                  src="/landing_images/Screenshot_11-7-2026_13541_localhost (1).jpeg"
                  alt="PrepWise Dashboard"
                />
              </div>
            </div>
          </div>
        </section>

        <div className="trusted scroll-fade">
          <p>Trusted by students preparing for</p>
          <div className="logo-row">
            <span>Google</span>
            <span>Microsoft</span>
            <span>Amazon</span>
            <span>Deloitte</span>
            <span>Flipkart</span>
            <span>TCS</span>
          </div>
        </div>

        <div className="wrap" id="features">
          <section className="section">
            <div className="scroll-fade">
              <div className="section-tag">// 01 — features</div>
              <h2 className="section-title">Every tool built to move you one step closer to the offer.</h2>
              <p className="section-sub">
                A detailed look at the premium functionalities inside your PrepWise career preparation dashboard.
              </p>
            </div>

            {/* Feature 1: AI & Human Mock Interviews */}
            <div className="feature-row scroll-fade">
              <div className="feature-text">
                <h3>Mock interviews that feel real</h3>
                <p>Practice technical, HR, and behavioral rounds with instant AI scoring across communication, structure, and depth.</p>
                <ul className="feature-list">
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    <strong>AI Buddy Mode:</strong> 24/7 adaptive AI interviewer.
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    <strong>Human Buddy Mode:</strong> Video & shared editor.
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    <strong>DSA Room:</strong> Multiplayer live coding duels.
                  </li>
                </ul>
              </div>
              <div className="feature-mock">
                <div className="mini-frame">
                  <div className="mini-bar">
                    <span className="d" />
                    <span className="d" />
                    <span className="d" />
                  </div>
                  <div className="mini-body">
                    <img src="/landing_images/Screenshot_11-7-2026_135942_localhost (1).jpeg" alt="Mock Interviews" />
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 2: Jobs & Internships Hub */}
            <div className="feature-row rev scroll-fade">
              <div className="feature-text">
                <h3>Find jobs and internships</h3>
                <p>Explore curated career opportunities at top tech companies. One-click apply directly from your dashboard.</p>
                <ul className="feature-list">
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    Role & location filters to target fits.
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    Full-time roles and internships updated daily.
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    Direct application links & track application status.
                  </li>
                </ul>
              </div>
              <div className="feature-mock">
                <div className="mini-frame">
                  <div className="mini-bar">
                    <span className="d" />
                    <span className="d" />
                    <span className="d" />
                  </div>
                  <div className="mini-body">
                    <img src="/landing_images/Screenshot_11-7-2026_135243_localhost (1).jpeg" alt="Jobs Hub" />
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 3: ATS Resume Checker */}
            <div className="feature-row scroll-fade">
              <div className="feature-text">
                <h3>ATS Resume Round check</h3>
                <p>Upload your resume and check compatibility against target job descriptions. Spot gaps before recruiters do.</p>
                <ul className="feature-list">
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    Detailed scoring out of 100 on ATS fit.
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    Identify missing keywords and style issues.
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    Actionable advice to format and rewrite descriptions.
                  </li>
                </ul>
              </div>
              <div className="feature-mock">
                <div className="mini-frame">
                  <div className="mini-bar">
                    <span className="d" />
                    <span className="d" />
                    <span className="d" />
                  </div>
                  <div className="mini-body">
                    <img src="/landing_images/Screenshot_11-7-2026_14044_localhost (1).jpeg" alt="ATS Resume Check" />
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 4: Customizable Mock Tests */}
            <div className="feature-row rev scroll-fade">
              <div className="feature-text">
                <h3>Tailored Mock Tests & Config</h3>
                <p>Configure custom practice tests covering core engineering, DSA, OOPs, and soft skills to test your limits.</p>
                <ul className="feature-list">
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    Select questions from specific skill focus areas.
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    Set duration, format, and difficulty criteria.
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    Track streaks, score history, and skill progress.
                  </li>
                </ul>
              </div>
              <div className="feature-mock">
                <div className="mini-frame">
                  <div className="mini-bar">
                    <span className="d" />
                    <span className="d" />
                    <span className="d" />
                  </div>
                  <div className="mini-body">
                    <img src="/landing_images/Screenshot_11-7-2026_135616_localhost (1).jpeg" alt="Mock Tests Configuration" />
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 5: Daily Coding Challenges */}
            <div className="feature-row scroll-fade">
              <div className="feature-text">
                <h3>Daily Coding Challenges</h3>
                <p>Keep your problem-solving momentum sharp with daily curated DSA challenges directly from top interview sets.</p>
                <ul className="feature-list">
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    Handpicked problem of the day.
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    Detailed specifications, categories, and difficulty metrics.
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    One-click access to code workspace to solve live.
                  </li>
                </ul>
              </div>
              <div className="feature-mock">
                <div className="mini-frame">
                  <div className="mini-bar">
                    <span className="d" />
                    <span className="d" />
                    <span className="d" />
                  </div>
                  <div className="mini-body">
                    <img src="/landing_images/Screenshot_11-7-2026_1451_localhost (1).jpeg" alt="Daily Challenge" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="section" id="showcase">
            <div className="scroll-fade">
              <div className="section-tag">// 02 — showcase</div>
              <h2 className="section-title">Built for students, used everywhere.</h2>
            </div>
          </section>

          <div className="stats-band scroll-fade" ref={statsGridRef}>
            <div className="wrap stats-grid">
              <div>
                <b data-count="10000">0</b>
                <span>Active learners</span>
              </div>
              <div>
                <b data-count="500">0</b>
                <span>Got hired last month</span>
              </div>
              <div>
                <b data-count="85">0</b>
                <span>Avg completion rate %</span>
              </div>
              <div>
                <b data-count="120">0</b>
                <span>Live competitions</span>
              </div>
            </div>
          </div>

          <section className="section" id="testimonials">
            <div className="scroll-fade">
              <div className="section-tag">// 03 — community</div>
              <h2 className="section-title">Loved by the people using it every day.</h2>
            </div>
          </section>
        </div>

        <div className="quote-marquee scroll-fade">
          <div className="qtrack" ref={trackRef}>
            {quotes.concat(quotes).map((q, idx) => (
              <div className="qcard" key={idx}>
                <p>"{q[0]}"</p>
                <div className="who">
                  <div className="avatar" />
                  <div>
                    <b>{q[1]}</b>
                    <span>{q[2]}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="final-cta scroll-fade">
          <h2>Ready to unlock your career?</h2>
          <p>Join thousands of students practicing right now — no credit card needed.</p>
          <form onSubmit={handleGetStarted} className="cta-box">
            <input
              type="email"
              placeholder="you@college.edu"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
            />
            <button type="submit">Get started →</button>
          </form>
        </div>

        <footer className="landing-footer">
          <div className="flinks">
            <a href="#">Internships</a>
            <a href="#">Competitions</a>
            <a href="#">Mock Interviews</a>
            <a href="#">Courses</a>
            <a href="#">About</a>
            <a href="#">Contact</a>
          </div>
          © 2026 PrepWise. Built to get you hired.
        </footer>
      </div>

      {showVideoModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setShowVideoModal(false)}
        >
          <div 
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '960px',
              aspectRatio: '16/9',
              background: '#000',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid #333',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: 'rgba(0,0,0,0.6)',
                color: '#fff',
                border: 'none',
                fontSize: '18px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                cursor: 'pointer',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onClick={() => setShowVideoModal(false)}
            >
              ✕
            </button>
            <video 
              src="/lander_page/promo.mp4" 
              controls 
              autoPlay 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
        </div>
      )}
    </>
  );
}
