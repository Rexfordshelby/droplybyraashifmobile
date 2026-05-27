import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, ScanLine, Keyboard, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';
import jsQR from 'jsqr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface QRScannerProps {
  onScan: (data: string) => void;
  type: 'pickup' | 'delivery';
  /** Required for delivery: the 4-digit OTP that must match. */
  expectedOtp?: string;
  /** Required for pickup: the order ID we expect inside the QR payload. */
  expectedOrderId?: string;
  trigger?: React.ReactNode;
}

interface ParsedPayload {
  orderId?: string;
  otp?: string;
  type?: string;
  raw: string;
  isJson: boolean;
}

function parseScanPayload(raw: string): ParsedPayload {
  try {
    const parsed = JSON.parse(raw);
    return {
      orderId: parsed.orderId || parsed.order_id,
      otp: parsed.otp,
      type: parsed.type,
      raw,
      isJson: true,
    };
  } catch {
    return { raw, isJson: false };
  }
}

export function QRScanner({ onScan, type, expectedOtp, expectedOrderId, trigger }: QRScannerProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'manual' | 'camera'>('manual');
  const [manualValue, setManualValue] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<'idle' | 'success' | 'error'>('idle');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const cooldownUntilRef = useRef<number>(0);
  const lastRejectedRef = useRef<string>('');
  const { toast } = useToast();

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const handleSuccess = useCallback(
    (value: string) => {
      stopCamera();
      setScanFeedback('success');
      toast({
        title: type === 'pickup' ? 'Pickup verified ✓' : 'Delivery verified ✓',
        description: type === 'pickup' ? 'Pickup confirmed.' : 'OTP matched. Marking as delivered.',
      });
      onScan(value);
      setTimeout(() => {
        setOpen(false);
        setManualValue('');
        setScanFeedback('idle');
      }, 600);
    },
    [onScan, stopCamera, toast, type],
  );

  const handleFailure = useCallback(
    (msg: string) => {
      setScanFeedback('error');
      cooldownUntilRef.current = Date.now() + 1500;
      toast({
        title: type === 'pickup' ? 'Wrong pickup code' : 'Wrong OTP',
        description: msg,
        variant: 'destructive',
      });
      setTimeout(() => setScanFeedback('idle'), 1200);
    },
    [toast, type],
  );

  /** Strict validation — same rules for camera + manual. Returns true if matched. */
  const validateAndComplete = useCallback(
    (rawInput: string, source: 'camera' | 'manual') => {
      const value = rawInput.trim();
      if (!value) return false;

      if (type === 'delivery') {
        if (!expectedOtp) {
          handleFailure('No OTP set on this order. Please refresh.');
          return false;
        }
        const parsed = parseScanPayload(value);
        // Reject scans tagged for the wrong stage
        if (parsed.isJson && parsed.type && parsed.type !== 'delivery') {
          handleFailure('This QR is for pickup, not delivery.');
          return false;
        }
        const candidate = parsed.otp || (/^\d{4}$/.test(value) ? value : '');
        if (!candidate) {
          handleFailure('That QR does not contain a delivery OTP.');
          return false;
        }
        if (candidate === expectedOtp) {
          handleSuccess(candidate);
          return true;
        }
        handleFailure('That OTP does not match this order.');
        return false;
      }

      // pickup
      if (!expectedOrderId) {
        handleFailure('Order info missing. Please refresh and try again.');
        return false;
      }
      const parsed = parseScanPayload(value);
      if (parsed.isJson && parsed.type && parsed.type !== 'pickup') {
        handleFailure('This QR is for delivery, not pickup.');
        return false;
      }
      const candidateOrderId = (parsed.orderId || value).trim();
      const expectedFull = expectedOrderId.toLowerCase();
      const expectedShort = expectedOrderId.slice(0, 8).toLowerCase();
      const cand = candidateOrderId.toLowerCase();
      const matches = cand === expectedFull || cand === expectedShort;

      if (matches) {
        handleSuccess(candidateOrderId);
        return true;
      }
      // Avoid spamming the same wrong-QR toast every frame
      if (source === 'camera' && lastRejectedRef.current === cand) {
        return false;
      }
      lastRejectedRef.current = cand;
      handleFailure('This QR is not for this order.');
      return false;
    },
    [expectedOrderId, expectedOtp, handleFailure, handleSuccess, type],
  );

  const tick = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    if (Date.now() < cooldownUntilRef.current) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code && code.data) {
      const matched = validateAndComplete(code.data, 'camera');
      if (matched) return; // stopCamera already called inside handleSuccess
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [validateAndComplete]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setCameraError('Camera needs a secure (HTTPS) connection. Use the code tab instead.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('This browser cannot access the camera. Use the code tab instead.');
      return;
    }
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
      } catch {
        // Fallback for laptops / front cam
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsScanning(true);
        rafRef.current = requestAnimationFrame(tick);
      }
    } catch (error: unknown) {
      const err = error as { name?: string };
      if (err?.name === 'NotAllowedError') {
        setCameraError('Camera permission denied. Allow camera access or use the code tab.');
      } else if (err?.name === 'NotFoundError') {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError('Could not start the camera. Use the code tab.');
      }
    }
  }, [tick]);

  // Auto-start the camera the moment the camera tab becomes active
  useEffect(() => {
    if (open && activeTab === 'camera' && !streamRef.current) {
      startCamera();
    }
    if (activeTab !== 'camera') {
      stopCamera();
    }
  }, [open, activeTab, startCamera, stopCamera]);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setManualValue('');
      setScanFeedback('idle');
      setActiveTab('manual');
      lastRejectedRef.current = '';
      cooldownUntilRef.current = 0;
    }
  }, [open, stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const manualLabel =
    type === 'pickup' ? 'Enter Order ID (8 characters)' : 'Enter 4-digit Delivery OTP';
  const manualPlaceholder = type === 'pickup' ? 'e.g. A1B2C3D4' : '0000';
  const manualMaxLength = type === 'delivery' ? 4 : 36;
  const manualPattern = type === 'delivery' ? '\\d*' : undefined;
  const manualInputMode: 'numeric' | 'text' = type === 'delivery' ? 'numeric' : 'text';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <ScanLine className="h-4 w-4 mr-2" />
            Scan {type === 'pickup' ? 'Pickup' : 'Delivery'} QR
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-w-[calc(100vw-2rem)] max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>
            {type === 'pickup' ? 'Verify Pickup' : 'Verify Delivery'}
          </DialogTitle>
          <DialogDescription>
            {type === 'pickup'
              ? "Scan the customer's pickup QR or enter the Order ID they show you."
              : 'Scan the delivery QR or enter the 4-digit OTP the receiver reads out.'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'manual' | 'camera')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">
              <Keyboard className="h-4 w-4 mr-2" />
              {type === 'delivery' ? 'OTP' : 'Code'}
            </TabsTrigger>
            <TabsTrigger value="camera">
              <Camera className="h-4 w-4 mr-2" />
              Scan QR
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="manual-input">{manualLabel}</Label>
              <Input
                id="manual-input"
                placeholder={manualPlaceholder}
                value={manualValue}
                onChange={(e) => {
                  let v = e.target.value;
                  if (type === 'delivery') v = v.replace(/\D/g, '');
                  else v = v.toUpperCase();
                  setManualValue(v);
                }}
                inputMode={manualInputMode}
                pattern={manualPattern}
                maxLength={manualMaxLength}
                className="text-center text-2xl font-mono tracking-widest h-14"
                autoFocus
              />
              {type === 'delivery' && (
                <p className="text-xs text-muted-foreground text-center">
                  The receiver will read out a 4-digit code shown on their tracking link.
                </p>
              )}
            </div>
            <Button
              onClick={() => validateAndComplete(manualValue, 'manual')}
              className="w-full h-11"
              disabled={
                !manualValue.trim() ||
                (type === 'delivery' && manualValue.length !== 4)
              }
            >
              Verify {type === 'pickup' ? 'Pickup' : 'Delivery'}
            </Button>
          </TabsContent>

          <TabsContent value="camera" className="pt-4">
            <div
              className={`relative aspect-square bg-muted rounded-lg overflow-hidden border-2 transition-colors ${
                scanFeedback === 'success'
                  ? 'border-emerald-500'
                  : scanFeedback === 'error'
                  ? 'border-destructive'
                  : 'border-transparent'
              }`}
            >
              {cameraError ? (
                <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                  <ShieldAlert className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">{cameraError}</p>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={startCamera}>
                      Try Again
                    </Button>
                    <Button variant="default" size="sm" onClick={() => setActiveTab('manual')}>
                      Use code instead
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {isScanning && scanFeedback === 'idle' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-48 border-2 border-primary rounded-lg relative">
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary" />
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary" />
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary" />
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary" />
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-primary/60 animate-pulse" />
                      </div>
                    </div>
                  )}
                  {scanFeedback === 'success' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/20">
                      <CheckCircle2 className="h-20 w-20 text-emerald-500" />
                    </div>
                  )}
                  {scanFeedback === 'error' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-destructive/20">
                      <AlertCircle className="h-20 w-20 text-destructive" />
                    </div>
                  )}
                </>
              )}
            </div>
            <p className="text-xs text-center text-muted-foreground mt-2">
              Hold the QR code steady inside the frame. Only this order's QR will be accepted.
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
