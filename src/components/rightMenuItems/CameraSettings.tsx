import { useEffect, useState } from "react";
import { MdVideoCameraBack } from "react-icons/md";
import { CameraCapabilities } from "../../app/utils/cameraCapabilities";
import { Icon, VStack } from "@chakra-ui/react";
import { RESOLUTIONS, Resolution } from "../../app/utils/resolution";
import { HandLandmarker } from "../../app/handLandmarker/handLandmarker";
import AccordionMenuItem from "./AccordionMenuItem";
import { SettingsCategory, SettingsDropdown, TwoWaySwitch, SettingsSlider } from "./input";

interface CameraSettingsProps {
  /**
   * Video track to control.
   */
  videoTrack: MediaStreamTrack | null;
  /**
   * Hand tracking worker to control.
   */
  handLandmarker: HandLandmarker | undefined;
  /**
   * Callback function to handle resolution change.
   * @param resolution New resolution.
   */
  onResolutionChange?: (resolution: Resolution) => void;
  /**
   * If true, all settings will be displayed as disabled.
   */
  isDisabled?: boolean;
}

/**
 * Cammera settings accordion menu item.
 * Controls settings of the provided video track and hand tracking worker.
 * Unavailable settings are displayed as disabled.
 */
export default function CameraSettings({
  videoTrack,
  handLandmarker,
  onResolutionChange,
  isDisabled,
}: CameraSettingsProps) {
  // #region State variables
  const [videoTrackCapabilities, setVideoTrackCapabilities] =
    useState<MediaTrackCapabilities | null>(null);

  // Tracking
  const [trackTwoHands, setTrackTwoHands] = useState<boolean>(true);
  const [settingNumHands, setSettingNumHands] = useState<boolean>(false);

  // Exposure
  const [autoexposure, setAutoexposure] = useState<boolean>(true);
  const [exposureTime, setExposureTime] = useState<number>(0);
  const [exposureCompensation, setExposureConmensation] = useState<number>(0);

  // Focus
  const [autofocus, setAutofocus] = useState<boolean>(true);
  const [focusDistance, setFocusDistance] = useState<number>(0);

  // White Balance
  const [autoWhiteBalance, setAutoWhiteBalance] = useState<boolean>(true);
  const [whiteBalance, setWhiteBalance] = useState<number>(0);

  // Resolution and Frame Rate
  const [resolution, setResolution] = useState<Resolution>(new Resolution(1280, 720));
  const [frameRate, setFrameRate] = useState<number>(0);

  // Image settings
  const [brightness, setBrightness] = useState<number>(0);
  const [contrast, setContrast] = useState<number>(0);
  const [saturation, setSaturation] = useState<number>(0);
  const [sharpness, setSharpness] = useState<number>(0);
  // #endregion State variables

  // #region useEffect
  /**
   * Updates the state variables when the video track changes.
   */
  useEffect(() => {
    if (videoTrack) {
      // Get the video track capabilities
      const capabilities = videoTrack.getCapabilities();
      setVideoTrackCapabilities(capabilities);

      // Get the current video track settings
      const settings = videoTrack.getSettings();
      // Focus
      if (CameraCapabilities.FocusMode in settings)
        setAutofocus(settings[CameraCapabilities.FocusMode] === "continuous");
      if (CameraCapabilities.FocusDistance in settings)
        setFocusDistance(settings[CameraCapabilities.FocusDistance] as number);

      // Exposure
      if (CameraCapabilities.ExposureMode in settings)
        setAutoexposure(settings[CameraCapabilities.ExposureMode] === "continuous");
      if (CameraCapabilities.ExposureTime in settings)
        setExposureTime(settings[CameraCapabilities.ExposureTime] as number);
      if (CameraCapabilities.ExposureCompensation in settings)
        setExposureConmensation(settings[CameraCapabilities.ExposureCompensation] as number);

      // White Balance
      if (CameraCapabilities.WhiteBalanceMode in settings)
        setAutoWhiteBalance(settings[CameraCapabilities.WhiteBalanceMode] === "continuous");
      if (CameraCapabilities.WhiteBalanceTemperature in settings)
        setWhiteBalance(settings[CameraCapabilities.WhiteBalanceTemperature] as number);

      // Image settings
      if (CameraCapabilities.Brightness in settings)
        setBrightness(settings[CameraCapabilities.Brightness] as number);
      if (CameraCapabilities.Contrast in settings)
        setContrast(settings[CameraCapabilities.Contrast] as number);
      if (CameraCapabilities.Saturation in settings)
        setSaturation(settings[CameraCapabilities.Saturation] as number);
      if (CameraCapabilities.Sharpness in settings)
        setSharpness(settings[CameraCapabilities.Sharpness] as number);

      // Resolution and Frame Rate
      if ("width" in settings && "height" in settings)
        setResolution(new Resolution(settings.width!, settings.height!));
      if ("frameRate" in settings) setFrameRate(settings.frameRate!);
    }
  }, [videoTrack]);

  /**
   * Updates the number of hands to track when the handLandmarkerWorker and trackTwoHands changes.
   */
  useEffect(() => {
    if (!handLandmarker) return;

    setSettingNumHands(true);
    handLandmarker
      .waitForInitialization()
      .then(() => {
        if (handLandmarker.settingNumHands) return;
        handLandmarker.setNumHands(trackTwoHands ? 2 : 1);
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        setSettingNumHands(false);
      });
  }, [handLandmarker, trackTwoHands]);

  // #endregion useEffect

  // #region Change handlers

  // Tracking
  function handleTrackTwoHandsChange(trackTwoHands: boolean) {
    if (!handLandmarker || handLandmarker.settingNumHands) return;
    setTrackTwoHands(trackTwoHands);
    // Message to the handLandmarkerWorker is sent in the useEffect hook
  }

  // Exposure
  function handleAutoexposureChange(autoexposure: boolean) {
    setAutoexposure(autoexposure);
    const capabilities = videoTrack?.getCapabilities();
    if (capabilities && CameraCapabilities.ExposureMode in capabilities) {
      const exposureMode = autoexposure ? "continuous" : "manual";
      videoTrack!.applyConstraints({
        advanced: [{ [CameraCapabilities.ExposureMode]: exposureMode } as any],
      });
    }
    handleExposureTimeChange(exposureTime);
    handleExposureCompensationChange(exposureCompensation);
  }

  function handleExposureTimeChange(exposureTime: number) {
    setExposureTime(exposureTime);
    const capabilities = videoTrack?.getCapabilities();
    if (capabilities && CameraCapabilities.ExposureTime in capabilities) {
      videoTrack!.applyConstraints({
        advanced: [{ [CameraCapabilities.ExposureTime]: exposureTime } as any],
      });
    }
  }

  function handleExposureCompensationChange(exposureCompensation: number) {
    setExposureConmensation(exposureCompensation);
    const capabilities = videoTrack?.getCapabilities();
    if (capabilities && CameraCapabilities.ExposureCompensation in capabilities) {
      videoTrack!.applyConstraints({
        advanced: [{ [CameraCapabilities.ExposureCompensation]: exposureCompensation } as any],
      });
    }
  }

  // Focus
  function handleAutofocusChange(autofocus: boolean) {
    setAutofocus(autofocus);
    const capabilities = videoTrack?.getCapabilities();
    if (capabilities && CameraCapabilities.FocusMode in capabilities) {
      const focusMode = autofocus ? "continuous" : "manual";
      videoTrack!.applyConstraints({
        advanced: [{ [CameraCapabilities.FocusMode]: focusMode } as any],
      });
    }
    handleFocusDistanceChange(focusDistance);
  }

  function handleFocusDistanceChange(focusDistance: number) {
    setFocusDistance(focusDistance);
    const capabilities = videoTrack?.getCapabilities();
    if (capabilities && CameraCapabilities.FocusDistance in capabilities) {
      videoTrack!.applyConstraints({
        advanced: [{ [CameraCapabilities.FocusDistance]: focusDistance } as any],
      });
    }
  }

  // White Balance
  function handleAutoWhiteBalanceChange(autoWhiteBalance: boolean) {
    setAutoWhiteBalance(autoWhiteBalance);
    const capabilities = videoTrack?.getCapabilities();
    if (capabilities && CameraCapabilities.WhiteBalanceMode in capabilities) {
      const whiteBalanceMode = autoWhiteBalance ? "continuous" : "manual";
      videoTrack!.applyConstraints({
        advanced: [{ [CameraCapabilities.WhiteBalanceMode]: whiteBalanceMode } as any],
      });
    }
    handleWhiteBalanceChange(whiteBalance);
  }

  function handleWhiteBalanceChange(whiteBalance: number) {
    setWhiteBalance(whiteBalance);
    const capabilities = videoTrack?.getCapabilities();
    if (capabilities && CameraCapabilities.WhiteBalanceTemperature in capabilities) {
      videoTrack!.applyConstraints({
        advanced: [{ [CameraCapabilities.WhiteBalanceTemperature]: whiteBalance } as any],
      });
    }
  }

  // Resolution and Frame Rate
  function handleResolutionChange(resolution: Resolution) {
    setResolution(resolution);
    videoTrack!
      .applyConstraints({ width: resolution.width, height: resolution.height })
      .then(() => {
        const settings = videoTrack!.getSettings();
        console.log(`Resolution set to ${settings.width}x${settings.height}`);
        if (onResolutionChange) onResolutionChange(resolution);
      });
  }

  function handleFrameRateChange(frameRate: number) {
    setFrameRate(frameRate);
    videoTrack!.applyConstraints({ frameRate });
  }

  // Image settings
  function handleBrightnessChange(brightness: number) {
    setBrightness(brightness);
    const capabilities = videoTrack?.getCapabilities();
    if (capabilities && CameraCapabilities.Brightness in capabilities) {
      videoTrack!.applyConstraints({
        advanced: [{ [CameraCapabilities.Brightness]: brightness } as any],
      });
    }
  }

  function handleContrastChange(contrast: number) {
    setContrast(contrast);
    const capabilities = videoTrack?.getCapabilities();
    if (capabilities && CameraCapabilities.Contrast in capabilities) {
      videoTrack!.applyConstraints({
        advanced: [{ [CameraCapabilities.Contrast]: contrast } as any],
      });
    }
  }

  function handleSaturationChange(saturation: number) {
    setSaturation(saturation);
    const capabilities = videoTrack?.getCapabilities();
    if (capabilities && CameraCapabilities.Saturation in capabilities) {
      videoTrack!.applyConstraints({
        advanced: [{ [CameraCapabilities.Saturation]: saturation } as any],
      });
    }
  }

  function handleSharpnessChange(sharpness: number) {
    setSharpness(sharpness);
    const capabilities = videoTrack?.getCapabilities();
    if (capabilities && CameraCapabilities.Sharpness in capabilities) {
      videoTrack!.applyConstraints({
        advanced: [{ [CameraCapabilities.Sharpness]: sharpness } as any],
      });
    }
  }
  // #endregion Change handlers

  // #region IsDisabled
  // Tracking
  const isTrackTwoHandsDisabled = !handLandmarker || settingNumHands;

  // Exposure
  const isAutoexposureDisabled =
    !videoTrack ||
    !videoTrackCapabilities ||
    !(CameraCapabilities.ExposureMode in videoTrackCapabilities);
  const isExposureTimeDisabled =
    !videoTrack ||
    !videoTrackCapabilities ||
    !(CameraCapabilities.ExposureTime in videoTrackCapabilities) ||
    autoexposure;
  const isExposureCompensationDisabled =
    !videoTrack ||
    !videoTrackCapabilities ||
    !(CameraCapabilities.ExposureCompensation in videoTrackCapabilities) ||
    !autoexposure;

  // Focus
  const isAutofocusDisabled =
    !videoTrack ||
    !videoTrackCapabilities ||
    !(CameraCapabilities.FocusMode in videoTrackCapabilities);
  const isFocusDistanceDisabled =
    !videoTrack ||
    !videoTrackCapabilities ||
    !(CameraCapabilities.FocusDistance in videoTrackCapabilities) ||
    autofocus;

  // White Balance
  const isAutoWhiteBalanceDisabled =
    !videoTrack ||
    !videoTrackCapabilities ||
    !(CameraCapabilities.WhiteBalanceMode in videoTrackCapabilities);
  const isWhiteBalanceDisabled =
    !videoTrack ||
    !videoTrackCapabilities ||
    !(CameraCapabilities.WhiteBalanceTemperature in videoTrackCapabilities) ||
    autoWhiteBalance;

  // Resolution and Frame Rate
  const isResolutionDisabled = !videoTrack || !videoTrackCapabilities;
  const isFrameRateDisabled = !videoTrack || !videoTrackCapabilities;

  // Image settings
  const isBrightnessDisabled =
    !videoTrack ||
    !videoTrackCapabilities ||
    !(CameraCapabilities.Brightness in videoTrackCapabilities);
  const isContrastDisabled =
    !videoTrack ||
    !videoTrackCapabilities ||
    !(CameraCapabilities.Contrast in videoTrackCapabilities);
  const isSaturationDisabled =
    !videoTrack ||
    !videoTrackCapabilities ||
    !(CameraCapabilities.Saturation in videoTrackCapabilities);
  const isSharpnessDisabled =
    !videoTrack ||
    !videoTrackCapabilities ||
    !(CameraCapabilities.Sharpness in videoTrackCapabilities);

  // #endregion IsDisabled

  // #region Frame Rate and Resolution helper functions
  /**
   * Generates a list of frame rates up to the maximum frame rate.
   */
  function generateFrameRates(maxFrameRate: number): number[] {
    const frameRates = [30];
    while (frameRates[frameRates.length - 1] < maxFrameRate) {
      frameRates.push(Math.min(frameRates[frameRates.length - 1] + 30, maxFrameRate));
    }
    return frameRates;
  }

  /**
   * Generates a list of resolutions that are supported by the video track capabilities.
   */
  function generateResolutions(videoTrackCapabilities: MediaTrackCapabilities): Resolution[] {
    const maxWidth = videoTrackCapabilities.width!.max!;
    const maxHeight = videoTrackCapabilities.height!.max!;
    return RESOLUTIONS.filter((resolution) => {
      return resolution.width <= maxWidth && resolution.height <= maxHeight;
    });
  }
  // #endregion Frame Rate and Resolution helper functions

  const videoTrackCapabilitiesAny = videoTrackCapabilities as any;

  // #region Return
  return (
    <AccordionMenuItem
      label="Camera Settings"
      icon={
        <Icon as={MdVideoCameraBack} boxSize={30} color={videoTrack ? "brand.400" : "red.600"} />
      }
    >
      <VStack alignItems="stretch" my={2}>
        <TwoWaySwitch
          labelFalse="Track One Hand"
          labelTrue="Two Hands"
          value={trackTwoHands}
          isDisabled={isTrackTwoHandsDisabled || isDisabled}
          onChange={handleTrackTwoHandsChange}
        />
        <SettingsDropdown
          label="Resolution"
          value={resolution}
          isDisabled={isResolutionDisabled || isDisabled}
          options={
            videoTrackCapabilities
              ? generateResolutions(videoTrackCapabilities)
              : [new Resolution(1280, 720)]
          }
          onChange={handleResolutionChange}
        />
        <SettingsDropdown
          label="Frame Rate"
          value={frameRate}
          isDisabled={isFrameRateDisabled || isDisabled}
          options={
            videoTrackCapabilities
              ? generateFrameRates(videoTrackCapabilities.frameRate!.max!)
              : [30]
          }
          onChange={handleFrameRateChange}
        />
      </VStack>

      <SettingsCategory
        name="Exposure"
        autoValue={autoexposure}
        isDisabled={isAutoexposureDisabled || isDisabled}
        onAutoChange={handleAutoexposureChange}
      >
        <SettingsSlider
          label="Exposure Time"
          value={exposureTime}
          isDisabled={isExposureTimeDisabled || isDisabled}
          min={videoTrackCapabilitiesAny?.exposureTime?.min}
          max={videoTrackCapabilitiesAny?.exposureTime?.max}
          step={videoTrackCapabilitiesAny?.exposureTime?.step}
          onChange={handleExposureTimeChange}
        />
        {/* <SettingsSlider
          label="Exposure Compensation"
          value={exposureCompensation}
          isDisabled={isExposureCompensationDisabled || isDisabled}
          min={videoTrackCapabilitiesAny?.exposureCompensation?.min}
          max={videoTrackCapabilitiesAny?.exposureCompensation?.max}
          step={videoTrackCapabilitiesAny?.exposureCompensation?.step}
          onChange={handleExposureCompensationChange}
        /> */}
      </SettingsCategory>

      <SettingsCategory
        name="Focus"
        autoValue={autofocus}
        isDisabled={isAutofocusDisabled || isDisabled}
        onAutoChange={handleAutofocusChange}
      >
        <SettingsSlider
          label="Focus Distance"
          value={focusDistance}
          isDisabled={isFocusDistanceDisabled || isDisabled}
          min={videoTrackCapabilitiesAny?.focusDistance?.min}
          max={videoTrackCapabilitiesAny?.focusDistance?.max}
          step={videoTrackCapabilitiesAny?.focusDistance?.step}
          onChange={handleFocusDistanceChange}
        />
      </SettingsCategory>

      <SettingsCategory
        name="White Balance"
        autoLabel={"Auto WB"}
        autoValue={autoWhiteBalance}
        isDisabled={isAutoWhiteBalanceDisabled || isDisabled}
        onAutoChange={handleAutoWhiteBalanceChange}
      >
        <SettingsSlider
          label="Color Temperature"
          value={whiteBalance}
          isDisabled={isWhiteBalanceDisabled || isDisabled}
          min={videoTrackCapabilitiesAny?.colorTemperature?.min}
          max={videoTrackCapabilitiesAny?.colorTemperature?.max}
          step={videoTrackCapabilitiesAny?.colorTemperature?.step}
          onChange={handleWhiteBalanceChange}
        />
      </SettingsCategory>

      <SettingsCategory
        name="Other"
        isDisabled={
          isDisabled ||
          (isBrightnessDisabled &&
            isContrastDisabled &&
            isSaturationDisabled &&
            isSharpnessDisabled)
        }
      >
        <SettingsSlider
          label="Brightness"
          value={brightness}
          isDisabled={isBrightnessDisabled || isDisabled}
          min={videoTrackCapabilitiesAny?.brightness?.min}
          max={videoTrackCapabilitiesAny?.brightness?.max}
          step={videoTrackCapabilitiesAny?.brightness?.step}
          onChange={handleBrightnessChange}
        />
        <SettingsSlider
          label="Contrast"
          value={contrast}
          isDisabled={isContrastDisabled || isDisabled}
          min={videoTrackCapabilitiesAny?.contrast?.min}
          max={videoTrackCapabilitiesAny?.contrast?.max}
          step={videoTrackCapabilitiesAny?.contrast?.step}
          onChange={handleContrastChange}
        />
        <SettingsSlider
          label="Saturation"
          value={saturation}
          isDisabled={isSaturationDisabled || isDisabled}
          min={videoTrackCapabilitiesAny?.saturation?.min}
          max={videoTrackCapabilitiesAny?.saturation?.max}
          step={videoTrackCapabilitiesAny?.saturation?.step}
          onChange={handleSaturationChange}
        />
        <SettingsSlider
          label="Sharpness"
          value={sharpness}
          isDisabled={isSharpnessDisabled || isDisabled}
          min={videoTrackCapabilitiesAny?.sharpness?.min}
          max={videoTrackCapabilitiesAny?.sharpness?.max}
          step={videoTrackCapabilitiesAny?.sharpness?.step}
          onChange={handleSharpnessChange}
        />
      </SettingsCategory>
    </AccordionMenuItem>
  );
  // #endregion Return
}
