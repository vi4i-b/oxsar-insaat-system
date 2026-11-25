import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  Video,
  RotateCcw,
  SwitchCamera,
  CheckCircle2,
  AlertTriangle,
  Square,
  ShieldAlert,
} from 'lucide-react';
import { formatDateTimeAZ, getBakuIsoNow } from '../../utils/formatters';

interface LiveCameraCaptureProps {
  label: string;
  watermarkTitle?: string;
  value: File | null;
  onChange: (file: File | null) => void;
}

type CaptureMode = 'photo' | 'video';

export const LiveCameraCapture: React.FC<LiveCameraCaptureProps> = ({
  label,
  watermarkTitle = 'Sahə Çekini',
  value,
  onChange,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerIntervalRef = useRef<number | null>(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [mode, setMode] = useState<CaptureMode>('photo');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [recording, setRecording] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    if (timerIntervalRef.current !== null) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop();
      } catch {
        // ignore stop error
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setRecording(false);
    setSecondsElapsed(0);
  }, []);

  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(value);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [value]);

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  const startCamera = useCallback(
    async (nextMode: CaptureMode = mode, nextFacing: 'environment' | 'user' = facingMode) => {
      setCameraError(null);
      stopStream();

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          'Brauzeriniz canlı kameranı dəstəkləmir və ya bağlantı HTTPS deyil. Chrome / Safari ilə açın.'
        );
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: nextFacing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: nextMode === 'video',
        });

        streamRef.current = stream;
        setCameraOpen(true);

        requestAnimationFrame(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            void videoRef.current.play().catch(() => {});
          }
        });
      } catch {
        setCameraError(
          'Kameraya icazə verilmədi. Zəhmət olmasa brauzerin ünvan sətrində kamera icazəsini aktiv edin.'
        );
        setCameraOpen(false);
      }
    },
    [facingMode, mode, stopStream]
  );

  const handleFlipCamera = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    if (cameraOpen) {
      void startCamera(mode, next);
    }
  };

  const handleModeSwitch = (nextMode: CaptureMode) => {
    setMode(nextMode);
    if (cameraOpen) {
      void startCamera(nextMode, facingMode);
    }
  };

  const handleTakePhoto = () => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const width = videoEl.videoWidth || 1280;
    const height = videoEl.videoHeight || 720;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoEl, 0, 0, width, height);

    // Stamp live Asia/Baku audit bar at bottom of photo
    const barHeight = Math.max(54, Math.round(height * 0.085));
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    ctx.fillRect(0, height - barHeight, width, barHeight);

    const fontSize = Math.max(15, Math.round(barHeight * 0.34));
    ctx.font = `bold ${fontSize}px Inter, Arial, sans-serif`;
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('OXŞAR İNŞAAT • CANLI KAMERA', 20, height - barHeight * 0.54);

    ctx.font = `600 ${Math.max(13, Math.round(fontSize * 0.88))}px Inter, Arial, sans-serif`;
    ctx.fillStyle = '#ffffff';
    const stamp = `${watermarkTitle} • ${formatDateTimeAZ(getBakuIsoNow())}`;
    ctx.fillText(stamp, 20, height - barHeight * 0.18);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `live_photo_${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });
        onChange(file);
        stopStream();
        setCameraOpen(false);
      },
      'image/jpeg',
      0.88
    );
  };

  const stopVideoRecording = useCallback(() => {
    if (timerIntervalRef.current !== null) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    setRecording(false);
  }, []);

  const handleStartVideo = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];

    const supportedMime = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
      ? 'video/webm;codecs=vp8,opus'
      : MediaRecorder.isTypeSupported('video/webm')
      ? 'video/webm'
      : MediaRecorder.isTypeSupported('video/mp4')
      ? 'video/mp4'
      : '';

    const recorder = supportedMime
      ? new MediaRecorder(streamRef.current, { mimeType: supportedMime })
      : new MediaRecorder(streamRef.current);

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      const finalMime = recorder.mimeType || 'video/webm';
      const ext = finalMime.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(chunksRef.current, { type: finalMime });
      const file = new File([blob], `live_video_${Date.now()}.${ext}`, {
        type: finalMime,
      });
      onChange(file);
      stopStream();
      setCameraOpen(false);
    };

    recorderRef.current = recorder;
    recorder.start();
    setRecording(true);
    setSecondsElapsed(0);

    timerIntervalRef.current = window.setInterval(() => {
      setSecondsElapsed((prev) => {
        if (prev + 1 >= 10) {
          stopVideoRecording();
          return 10;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const handleRetake = () => {
    onChange(null);
    void startCamera(mode, facingMode);
  };

  const isVideoFile = value?.type.startsWith('video/');

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
          {label} *
        </label>
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
          <ShieldAlert className="w-3 h-3" /> Qalereya bağlıdır
        </span>
      </div>

      {cameraError && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3.5 flex items-start gap-2.5 text-xs text-rose-800 font-medium">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{cameraError}</span>
        </div>
      )}

      {/* Captured Media Preview */}
      {value && previewUrl && !cameraOpen ? (
        <div className="rounded-2xl overflow-hidden border-2 border-emerald-500 bg-slate-950">
          {isVideoFile ? (
            <video
              src={previewUrl}
              controls
              playsInline
              className="w-full max-h-64 object-cover bg-black"
            />
          ) : (
            <img
              src={previewUrl}
              alt="Çəkilmiş canlı sahə fotosu"
              className="w-full max-h-64 object-cover"
            />
          )}
          <div className="p-3 bg-emerald-950 text-emerald-50 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Canlı {isVideoFile ? 'video' : 'foto'} çəkildi və təsdiqə hazırdır</span>
            </div>
            <button
              type="button"
              onClick={handleRetake}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Yenidən Çək
            </button>
          </div>
        </div>
      ) : cameraOpen ? (
        /* Live Camera Viewfinder */
        <div className="rounded-2xl overflow-hidden border-2 border-sky-500 bg-slate-950 text-white">
          <div className="relative bg-black aspect-video flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Live Badge */}
            <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/80 border border-white/15 text-[11px] font-bold">
              <span
                className={`w-2 h-2 rounded-full ${
                  recording ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'
                }`}
              />
              {recording ? `REC 00:${String(secondsElapsed).padStart(2, '0')} / 00:10` : 'CANLI KAMERA'}
            </div>

            {/* Flip Camera */}
            {!recording && (
              <button
                type="button"
                onClick={handleFlipCamera}
                className="absolute top-3 right-3 p-2 rounded-full bg-slate-950/80 hover:bg-slate-900 border border-white/15 text-white"
                title="Kameranı çevir"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="p-3.5 space-y-3 bg-slate-900">
            {/* Mode Switcher */}
            {!recording && (
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-800">
                <button
                  type="button"
                  onClick={() => handleModeSwitch('photo')}
                  className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                    mode === 'photo' ? 'bg-sky-600 text-white' : 'text-slate-300'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" /> Foto
                </button>
                <button
                  type="button"
                  onClick={() => handleModeSwitch('video')}
                  className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                    mode === 'video' ? 'bg-sky-600 text-white' : 'text-slate-300'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" /> 5–10 san. Video
                </button>
              </div>
            )}

            {/* Shutter Action */}
            <div className="flex items-center gap-2">
              {mode === 'photo' ? (
                <button
                  type="button"
                  onClick={handleTakePhoto}
                  className="flex-1 py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-[0.99] text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg"
                >
                  <Camera className="w-5 h-5" /> Şəkli İndi Çək
                </button>
              ) : recording ? (
                <button
                  type="button"
                  onClick={stopVideoRecording}
                  disabled={secondsElapsed < 2}
                  className="flex-1 py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg"
                >
                  <Square className="w-4 h-4 fill-current" /> Videonu Saxla ({secondsElapsed} san.)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartVideo}
                  className="flex-1 py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg"
                >
                  <Video className="w-5 h-5" /> Video Çəkilişi Başlat (maks. 10 san.)
                </button>
              )}

              {!recording && (
                <button
                  type="button"
                  onClick={() => {
                    stopStream();
                    setCameraOpen(false);
                  }}
                  className="px-4 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  Bağla
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Closed Trigger Button */
        <button
          type="button"
          onClick={() => void startCamera('photo', facingMode)}
          className="w-full rounded-2xl border-2 border-dashed border-sky-400 bg-sky-50/70 hover:bg-sky-100/70 active:scale-[0.99] transition-all p-5 flex flex-col items-center justify-center gap-2 text-center"
        >
          <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-600/25">
            <Camera className="w-6 h-6" />
          </div>
          <div className="font-display font-extrabold text-sm text-slate-900">
            Canlı Kameranı Aç (Foto və ya 5–10 san. Video)
          </div>
          <div className="text-xs text-slate-500 max-w-xs">
            Obyektin hazırkı vəziyyətini birbaşa kameradan çəkin. Köhnə qalereya faylları qəbul edilmir.
          </div>
        </button>
      )}
    </div>
  );
};
