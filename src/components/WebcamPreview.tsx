import { useState, useEffect, useRef, useCallback, MutableRefObject } from "react";
import * as requests from "../app/requests/requests";
import { useToast } from "@chakra-ui/react";
import { HandLandmarker } from "../app/handLandmarker/handLandmarker";
import { VideoProcessor } from "../app/video/videoProcessing";
import { drawHands } from "../app/video/drawing";
import { Preview, NoPreview, VideoText } from "./cameraPreviewComponents";

interface WebcamPreviewProps {
  /**
   * Media stream from the webcam.
   * Undefined if the webcam is not selected.
   * Null if the webcam is selected but the stream is not ready.
   */
  videoStream: MediaStream | null | undefined;
  /**
   * Directory handle to save the recorded video.
   */
  directoryHandle: FileSystemDirectoryHandle | undefined;
  /**
   * Reference to the HandLandmarker instance.
   */
  handLandmarkerRef: MutableRefObject<HandLandmarker | undefined>;
  /**
   * Whether the video is currently being recorded.
   */
  isRecording: boolean;
  /**
   * Whether the video is currently being processed.
   */
  isProcessing?: boolean;
  /**
   * Callback when the recording is stopped.
   * @param videoChunks Recorded video chunks.
   * @param startTime Start time of the recording (number of milliseconds elapsed since midnight, January 1, 1970 Universal Coordinated Time (UTC)).
   */
  onRecordingStop?: (videoChunks: EncodedVideoChunk[], startTime: number) => Promise<void>;
  /**
   * Callback when starting recording failed.
   */
  onStartRecordingFailed?: () => void;
}

/**
 * Component for displaying the webcam preview and hand tracking results.
 */
export default function WebcamPreview({
  videoStream,
  directoryHandle,
  handLandmarkerRef,
  isRecording,
  isProcessing,
  onRecordingStop,
  onStartRecordingFailed,
}: WebcamPreviewProps) {
  // Video processing and recording
  const videoProcessorRef = useRef<VideoProcessor>(new VideoProcessor(handleFrameProcessed));
  const [recordingInProgress, setRecordingInProgress] = useState(false); // Recording state - true from startRecording to stopRecording
  const [recordingOnServer, setRecordingOnServer] = useState<boolean>();

  // Hand visualization
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const toast = useToast();

  Date.now()
  /**
   * Effect for updating the video stream in the video processor.
   */
  useEffect(() => {
    // Stop video processor
    if (videoProcessorRef.current.isProcessing) {
      videoProcessorRef.current.stopProcessing();
    }

    if (!videoStream) return;

    // Set up video processor
    videoProcessorRef.current.startProcessing(videoStream.getTracks()[0]);
  }, [videoStream]);

  /**
   * Callback to process video frame with HandLandmarker.
   */
  function handleFrameProcessed(frame: VideoFrame) {
    // Process the frame with HandLandmarker and draw the results
    if (
      handLandmarkerRef.current &&
      handLandmarkerRef.current.initialized &&
      !handLandmarkerRef.current.processingFrame && // Only start processing if the previous frame is done
      !handLandmarkerRef.current.processingVideo // Only start processing if no video is being processed
    ) {
      handLandmarkerRef.current.processFrame(frame).then((hands) => {
        if (canvasRef.current) drawHands(hands, canvasRef.current.getContext("2d")!);
      });
    }
  }

  /**
   * Starts video recording.
   */
  const startRecording = useCallback(async () => {
    if (recordingInProgress) throw new Error("Recording already in progress");
    if (!directoryHandle) throw new Error("No directory selected");

    // Check recording status of the server
    let connectionSettings = await requests.getConnectionSettings();
    if (connectionSettings) {
      // Connected to a server
      const recordingStatus = await requests.isRecording();
      if (recordingStatus === undefined) {
        // Server connected, but failed to get recording status => Start recording only on the client side
        toast({
          title: "Failed to get recording status",
          description:
            "Failed to get recording status from the connected server. Recoring will start only on the client side.",
          status: "warning",
          duration: 10000,
          isClosable: true,
        });
        connectionSettings = null;
      } else if (recordingStatus === true) {
        // Recording already in progress on the server => Do not start recording
        toast({
          title: "Recording already in progress",
          description:
            "Recording is already in progress on the server. Please stop the recording on the server first.",
          status: "error",
          duration: 10000,
          isClosable: true,
        });
        onStartRecordingFailed?.();
        return;
      } else {
        // Else recording status is synced with the server => start recording on the server
        requests
          .setRecording(true)
          .then((response) => {
            setRecordingOnServer(true);
          })
          .catch((error) => {
            const message = error.response?.data || error.message;
            toast({
              title: "Failed to start recording",
              description: `Failed to start recording on the server: ${message}`,
              status: "error",
              duration: 10000,
              isClosable: true,
            });
          });
      }
    }

    await videoProcessorRef.current.startRecording(
      directoryHandle,
      undefined, // TODO: Add file name input (optional)
      (e) => {
        console.error(e);
        if (onStartRecordingFailed) onStartRecordingFailed();
      }
    );

    setRecordingInProgress(true);
  }, [directoryHandle, onStartRecordingFailed, recordingInProgress, toast]);

  /**
   * Stops video recording and saves the result.
   * Processes the recorded video with HandLandmarker and saves the hand data.
   */
  const stopRecording = useCallback(async () => {
    if (!recordingInProgress) throw new Error("Recording not in progress");

    // Stop recording on the server
    if (recordingOnServer) {
      setRecordingOnServer(false);
      requests.setRecording(false).catch((error) => {
        const message = error.response?.data || error.message;
        toast({
          title: "Failed to stop recording",
          description: `Failed to stop recording on the server: ${message}`,
          status: "error",
          duration: 10000,
          isClosable: true,
        });
      });
    }

    // Stop recoring
    const vp = videoProcessorRef.current;
    await vp.stopRecording();
    console.log(
      "Recording stopped, avg fps:",
      (vp.frameCount / (Date.now() - vp.recordingStartTime)) * 1000
    );

    setRecordingInProgress(false); // Reset recording state

    if (onRecordingStop) await onRecordingStop(vp.recordedChunks, vp.recordingStartTime);
    vp.recordedChunks.length = 0; // Clear recorded chunks
  }, [onRecordingStop, recordingInProgress, recordingOnServer, toast]);

  /**
   * Effect for starting or stopping recording based on the recording state.
   */
  useEffect(() => {
    if (isRecording && !recordingInProgress) {
      startRecording();
    } else if (!isRecording && recordingInProgress) {
      stopRecording();
    }
  }, [isRecording, recordingInProgress, startRecording, stopRecording]);

  return (
    <>
      {videoStream === undefined ? (
        <NoPreview>
          <VideoText text="No camera selected" />
        </NoPreview>
      ) : (
        <Preview
          stream={videoStream}
          canvasRef={canvasRef}
          overlayColor={isProcessing ? "whiteAlpha.500" : "transparent"}
        >
          {isProcessing ? <VideoText text="Processing in progress..." spinner={true} /> : null}
        </Preview>
      )}
    </>
  );
}
