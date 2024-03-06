/*
This script contains the webcam component.
This component handles:
- Show a message if no camera source is selected
- Create a hand landmarker
- Display the webcam feed
- Overlay the hand landmarks on the webcam feed
- Record the webcam feed
*/

import React from "react";
import { CSSProperties } from "react";
import { Box, Button } from "@chakra-ui/react";
import { HandLandmarker, FilesetResolver, HandLandmarkerResult } from "@mediapipe/tasks-vision";
import { drawHands } from "./drawing";
import { VideoRecorder } from "./videoRecorder";
import { frame } from "framer-motion";

interface VideoBoxProps {
  height?: CSSProperties["height"];
  width?: CSSProperties["width"];
  aspectRatio?: CSSProperties["aspectRatio"];
  children?: React.ReactNode;
}

// This component is used as a container for the webcam feed and hand landmarks
function VideoBox({ height = "480px", width, aspectRatio, children }: VideoBoxProps) {
  return (
    <Box
      h={height}
      w={width}
      aspectRatio={aspectRatio}
      display="flex"
      alignItems="center"
      justifyContent="center"
      fontWeight="semibold"
      fontSize="lg"
      bg="gray.100"
      borderWidth="1px"
      borderRadius="lg"
      m="16px"
    >
      {children}
    </Box>
  );
}

// This component is used to display a message when no camera source is selected
function NoWebcamSelected({ height = "480px" }: { height?: CSSProperties["height"] }) {
  return (
    <VideoBox height={height} aspectRatio={3 / 2}>
      No camera source selected
    </VideoBox>
  );
}

// This function creates a new hand landmarker
async function createHandLandmarker() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
  );
  return await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numHands: 2,
  });
}

interface WebcamProps {
  device: InputDeviceInfo | undefined;
  videoRef: React.RefObject<HTMLVideoElement>;
  height?: CSSProperties["height"];
}

export default function Webcam({ device, videoRef, height = "480px" }: WebcamProps) {
  const [initialized, setInitialized] = React.useState<boolean>(false);
  const [handLandmarker, setHandLandmarker] = React.useState<HandLandmarker>();
  const [lastProcessTime, setLastProcessTime] = React.useState<number>(0);
  const [videoRecorder, setVideoRecorder] = React.useState<VideoRecorder>();
  const [stream, setStream] = React.useState<MediaStream>();
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  // Initialize
  React.useEffect(() => {
    if (initialized) return;

    setInitialized(true);

    // Create hand landmarker
    createHandLandmarker()
      .then((handLandmarker) => {
        console.log("Hand landmarker created");
        setHandLandmarker(handLandmarker);
      })
      .catch((error) => {
        console.error("Error creating hand landmarker", error);
      });

    // Create video recorder
    const videoRecorder = new VideoRecorder();
    setVideoRecorder(videoRecorder);
  }, []);

  // Set video source to selected webcam
  React.useEffect(() => {
    if (!device) return;

    // Create constraints wit the best resolution and frame rate
    const deviceCapabilities = device.getCapabilities();
    const constraints: MediaStreamConstraints = {
      video: {
        deviceId: device.deviceId,
        width: deviceCapabilities.width?.max,
        height: deviceCapabilities.height?.max,
        frameRate: deviceCapabilities.frameRate?.max,
      },
    };

    // Get and set the webcam stream
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => {
        setStream(stream);
        const videoTrack = stream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();

        videoRef.current!.srcObject = stream;
        canvasRef.current!.width = settings.width!;
        canvasRef.current!.height = settings.height!;
      })
      .catch((error) => {
        console.error("Error accessing the webcam", error);
      });
  }, [device, videoRef]);

  // Hand tracking loop
  const track = React.useCallback(
    (frameCount: number = 0) => {
      if (!handLandmarker) return;

      if (
        videoRef.current &&
        !videoRef.current.paused &&
        canvasRef.current &&
        frameCount % 5 === 0
      ) {
        const start = performance.now();
        // Get landmarks
        const results = handLandmarker.detectForVideo(videoRef.current, performance.now());

        // Draw landmarks
        const canvasCtx = canvasRef.current.getContext("2d");
        if (!canvasCtx) {
          console.error("Canvas context not found");
          return;
        }
        drawHands(results, canvasCtx);
        const end = performance.now();
        setLastProcessTime(end - start);
      }

      requestAnimationFrame(() => track(frameCount + 1));
    },
    [handLandmarker, videoRef, canvasRef]
  );

  // Start hand tracking loop
  React.useEffect(() => {
    if (handLandmarker) {
      console.log("Starting hand tracking loop");
      track();
    }
  }, [handLandmarker, track]);

  // Record video
  const handleRecord = async () => {
    if (videoRecorder!.recording) {
      console.log("Stop recording");
      videoRecorder!.stopRecording();
    } else {
      console.log("Start recording");
      const fileHandler = await window.showSaveFilePicker({
        suggestedName: "myVideo.webm",
        types: [
          {
            description: "Video File",
            accept: { "video/webm": [".webm"] },
          },
        ],
      });
      videoRecorder!.startRecording(fileHandler, stream!.getTracks()[0]);
    }
  };

  if (device) {
    const aspect =
      videoRef.current && videoRef.current.videoWidth && videoRef.current.videoHeight
        ? videoRef.current.videoWidth / videoRef.current.videoHeight
        : 4 / 3;
    return (
      <>
        <VideoBox height={height} aspectRatio={aspect}>
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
            }}
          >
            <video
              className="webcam"
              ref={videoRef}
              style={{ position: "absolute", left: "0px", top: "0px", height: height }}
              autoPlay={true}
              playsInline={true}
            ></video>
            <canvas
              className="output_canvas"
              ref={canvasRef}
              style={{
                position: "absolute",
                left: "0px",
                top: "0px",
                height: height,
                aspectRatio: aspect,
              }}
            ></canvas>
            <p
              style={{
                fontSize: "10pt",
                position: "absolute",
                left: "5px",
                top: "5px",
                zIndex: 10,
              }}
            >
              Last process time {lastProcessTime.toFixed(2)} ms
            </p>
            <Button
              onClick={handleRecord}
              colorScheme="red"
              // position="relative"
              marginBottom="16px"
              w="120px"
            >
              {videoRecorder?.recording ? "Stop" : "Record"}
            </Button>
          </div>
        </VideoBox>
      </>
    );
  } else {
    return NoWebcamSelected({ height });
  }
}
