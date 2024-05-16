import { Button } from "@chakra-ui/react";

/**
 * Props for the RecordButton component.
 */
interface RecordButtonProps {
  isRecording: boolean;
  isDisabled?: boolean;
  onClick?: () => void;
}

/**
 * Button component for starting and stopping recording.
 */
export default function RecordButton({ isRecording, isDisabled, onClick }: RecordButtonProps) {
  return (
    <Button onClick={onClick} isDisabled={isDisabled} colorScheme={"red"} m="16px">
      {isRecording ? "Stop" : "Record"}
    </Button>
  );
}