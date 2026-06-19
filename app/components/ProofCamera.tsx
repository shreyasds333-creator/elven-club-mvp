"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { X, RotateCcw, Check, Zap } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/authStore";
import { color, radius } from "@/lib/tokens";

type Stage = "viewfinder" | "preview" | "submitting" | "done";

interface Props {
  challengeId:    number;
  challengeTitle: string;
  onSuccess:      () => void;
  onClose:        () => void;
}

export default function ProofCamera({ challengeId, challengeTitle, onSuccess, onClose }: Props) {
  const { user } = useAuth();
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ── All state before any early returns ─────────────────────────────────────
  const [stage,       setStage]       = useState<Stage>("viewfinder");
  const [snapUrl,     setSnapUrl]     = useState<string | null>(null);
  const [flash,       setFlash]       = useState(false);
  const [facingMode,  setFacingMode]  = useState<"environment" | "user">("environment");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // ── Camera stream lifecycle ─────────────────────────────────────────────────
  useEffect(() => {
    if (stage !== "viewfinder") return;
    let cancelled = false;
    setCameraReady(false);
    setCameraError(false);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraError(true);
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: facingMode } }, audio: false })
      .then(stream => {
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
          setCameraReady(true);
        }
      })
      .catch(() => { if (!cancelled) setCameraError(true); });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, [stage, facingMode]);

  // ── Auto-call onSuccess after done screen ──────────────────────────────────
  useEffect(() => {
    if (stage !== "done") return;
    const t = setTimeout(onSuccess, 2600);
    return () => clearTimeout(t);
  }, [stage, onSuccess]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSnap = useCallback(() => {
    if (!cameraReady || !videoRef.current || !canvasRef.current) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    const v = videoRef.current;
    const c = canvasRef.current;
    c.width  = v.videoWidth  || 640;
    c.height = v.videoHeight || 480;
    c.getContext("2d")?.drawImage(v, 0, 0);
    setSnapUrl(c.toDataURL("image/jpeg", 0.88));

    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;

    setTimeout(() => setStage("preview"), 220);
  }, [cameraReady]);

  const handleRetake = useCallback(() => {
    setSnapUrl(null);
    setSubmitError("");
    setStage("viewfinder");
  }, []);

  const handleFlip = useCallback(() => {
    setFacingMode(f => f === "environment" ? "user" : "environment");
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!snapUrl || !user?.id) return;
    setStage("submitting");
    setSubmitError("");

    try {
      const blob = await (await fetch(snapUrl)).blob();
      const path = `${user.id}/${challengeId}/${Date.now()}.jpg`;

      let photoUrl = "";
      const { error: uploadErr } = await supabase.storage
        .from("proof-photos")
        .upload(path, blob, { contentType: "image/jpeg", upsert: false });

      if (!uploadErr) {
        const { data } = supabase.storage.from("proof-photos").getPublicUrl(path);
        photoUrl = data.publicUrl;
      }

      const { error: insertErr } = await supabase.from("proof_submissions").insert({
        user_id:         user.id,
        challenge_id:    challengeId,
        challenge_title: challengeTitle,
        photo_url:       photoUrl || null,
        streak_at_time:  0,
      });

      if (insertErr) throw new Error(insertErr.message);

      setStage("done");
    } catch {
      setSubmitError("Upload failed — please try again.");
      setStage("preview");
    }
  }, [snapUrl, user?.id, challengeId, challengeTitle]);

  // ── DONE ────────────────────────────────────────────────────────────────────
  if (stage === "done") {
    return (
      <Overlay onClose={onClose}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "0 40px", textAlign: "center" }}>
          <div style={{
            width: 96, height: 96, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(77,200,122,0.20) 0%, transparent 70%)",
            border: "2px solid rgba(77,200,122,0.40)",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 28,
            boxShadow: "0 0 60px rgba(77,200,122,0.18)",
            animation: "pcBounce 0.48s cubic-bezier(.175,.885,.32,1.275) both",
          }}>
            <Check size={44} style={{ color: "#4DC87A" }} />
          </div>
          <h2 style={{ fontSize: "1.875rem", fontWeight: 900, letterSpacing: "-0.045em", color: "#fff", margin: "0 0 10px", lineHeight: 1 }}>
            Proof Sent 🔥
          </h2>
          <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.46)", margin: "0 0 28px", lineHeight: 1.55 }}>
            {challengeTitle}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 22px", borderRadius: radius.full, background: "rgba(201,168,76,0.10)", border: `1px solid ${color.gold.border}` }}>
            <Zap size={14} style={{ color: color.gold.base }} />
            <span style={{ fontSize: "0.9rem", fontWeight: 700, color: color.gold.base }}>+50 coins earned</span>
          </div>
        </div>
        <style>{`
          @keyframes pcBounce {
            0%   { opacity:0; transform:scale(.5);  }
            65%  { opacity:1; transform:scale(1.08); }
            100% { opacity:1; transform:scale(1);   }
          }
        `}</style>
      </Overlay>
    );
  }

  // ── SUBMITTING ──────────────────────────────────────────────────────────────
  if (stage === "submitting") {
    return (
      <Overlay onClose={onClose}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 18 }}>
          {snapUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={snapUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.28 }} />
          )}
          <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", border: "2.5px solid rgba(226,190,116,0.50)", borderTopColor: "#E2BE74", animation: "pcSpin 0.9s linear infinite" }} />
            <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.58)", letterSpacing: "0.04em" }}>Uploading proof…</p>
          </div>
        </div>
        <style>{`@keyframes pcSpin { to { transform: rotate(360deg); } }`}</style>
      </Overlay>
    );
  }

  // ── PREVIEW ─────────────────────────────────────────────────────────────────
  if (stage === "preview") {
    return (
      <Overlay onClose={onClose}>
        {snapUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={snapUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.52) 0%, rgba(0,0,0,0.14) 40%, rgba(0,0,0,0.72) 100%)" }} />

        {/* Top bar */}
        <div style={{ position: "absolute", top: "calc(env(safe-area-inset-top,0px) + 16px)", left: 16, right: 16, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 13px", borderRadius: radius.full, background: "rgba(0,0,0,0.58)", backdropFilter: "blur(16px)" }}>
            <span style={{ fontSize: 12 }}>📸</span>
            <span style={{ fontSize: "0.6875rem", fontWeight: 600, color: "rgba(255,255,255,0.80)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{challengeTitle}</span>
          </div>
          <button onClick={handleRetake} style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(0,0,0,0.56)", border: "1px solid rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={16} color="rgba(255,255,255,0.80)" />
          </button>
        </div>

        {/* Bottom actions */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10,
          padding: `20px 20px calc(env(safe-area-inset-bottom,0px) + 28px)`,
          background: "rgba(4,5,8,0.94)", backdropFilter: "blur(40px)",
          borderRadius: "22px 22px 0 0", borderTop: "1px solid rgba(255,255,255,0.07)",
        }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
            <div style={{ width: 32, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.12)" }} />
          </div>

          {submitError && (
            <p style={{ fontSize: "0.75rem", color: "rgba(255,80,80,0.80)", textAlign: "center", margin: "0 0 14px", lineHeight: 1.4 }}>{submitError}</p>
          )}

          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={handleRetake}
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "15px 0", borderRadius: radius.full, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.72)", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer" }}
            >
              <RotateCcw size={15} />
              Retake
            </button>
            <button
              onClick={handleSubmit}
              style={{ flex: 2, padding: "15px 0", borderRadius: radius.full, background: "linear-gradient(135deg,#E2BE74 0%,#C9A84C 100%)", border: "none", color: "#000", fontSize: "0.875rem", fontWeight: 800, letterSpacing: "0.04em", cursor: "pointer", boxShadow: "0 4px 24px rgba(201,168,76,0.42)" }}
            >
              Submit Proof 🔥
            </button>
          </div>
        </div>
      </Overlay>
    );
  }

  // ── VIEWFINDER ──────────────────────────────────────────────────────────────
  return (
    <Overlay onClose={onClose}>
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {cameraReady ? (
        <video ref={videoRef} autoPlay playsInline muted style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 70% at 50% 40%, rgba(18,24,18,1) 0%, #030305 100%)" }}>
          {cameraError && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <span style={{ fontSize: "2rem", opacity: 0.30 }}>📷</span>
              <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.28)", textAlign: "center", maxWidth: 240, lineHeight: 1.5 }}>
                Camera unavailable.<br />Allow camera access in your browser settings.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Vignette */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 72% 66% at 50% 42%, transparent 28%, rgba(0,0,0,0.56) 68%, rgba(0,0,0,0.84) 100%)", pointerEvents: "none" }} />

      {/* Flash */}
      {flash && <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: 0.88, pointerEvents: "none", animation: "pcFlash 0.22s ease-out both" }} />}

      {/* Top bar */}
      <div style={{ position: "absolute", top: "calc(env(safe-area-inset-top,0px) + 16px)", left: 16, right: 16, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 13px", borderRadius: radius.full, background: "rgba(0,0,0,0.60)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.09)" }}>
          <span style={{ fontSize: 11 }}>📸</span>
          <span style={{ fontSize: "0.6875rem", fontWeight: 600, color: "rgba(255,255,255,0.70)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{challengeTitle}</span>
        </div>
        <button onClick={onClose} style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(0,0,0,0.58)", border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <X size={16} color="rgba(255,255,255,0.78)" />
        </button>
      </div>

      {/* Bottom controls */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10, padding: `0 28px calc(env(safe-area-inset-bottom,0px) + 40px)`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>

        {/* Flip */}
        <button
          onClick={handleFlip}
          style={{ width: 50, height: 50, borderRadius: "50%", background: "rgba(255,255,255,0.09)", backdropFilter: "blur(14px)", border: "1px solid rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
        >
          <RotateCcw size={20} color="rgba(255,255,255,0.78)" />
        </button>

        {/* Shutter */}
        <button
          onClick={handleSnap}
          disabled={!cameraReady}
          style={{
            width: 84, height: 84, borderRadius: "50%",
            background: "transparent",
            border: "3px solid #E2BE74",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: cameraReady ? "pointer" : "not-allowed",
            boxShadow: "0 0 0 6px rgba(226,190,116,0.12), 0 0 0 12px rgba(226,190,116,0.06), 0 10px 44px rgba(0,0,0,0.90), 0 0 36px rgba(226,190,116,0.28)",
            opacity: cameraReady ? 1 : 0.45,
            transition: "opacity 0.3s ease",
          }}
          onPointerDown={e => { if (cameraReady) e.currentTarget.style.transform = "scale(0.91)"; }}
          onPointerUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
          onPointerLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
        >
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "radial-gradient(circle at 38% 36%, #E2BE74, #C9A84C)", boxShadow: "0 0 30px rgba(226,190,116,0.70), inset 0 1px 0 rgba(255,255,255,0.22)" }} />
        </button>

        {/* Spacer */}
        <div style={{ width: 50 }} />
      </div>

      <style>{`
        @keyframes pcFlash { 0% { opacity:.88; } 100% { opacity:0; } }
      `}</style>
    </Overlay>
  );
}

// ── Full-screen overlay wrapper ─────────────────────────────────────────────────
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  // Prevent scroll on body while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  void onClose; // overlay itself doesn't close on background tap — user must use X button

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "#000", overflow: "hidden" }}>
      {children}
    </div>
  );
}
