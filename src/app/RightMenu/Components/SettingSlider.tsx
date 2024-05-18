import {
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Text,
  VStack,
} from "@chakra-ui/react";
import SettingsComponent from "./SettingsComponent";

interface SettingSliderProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  isDisabled?: boolean;
  onChange?: (value: number) => void;
  onChangeEnd?: (value: number) => void;
}

/**
 * Setting slider component.
 * Used to adjust camera settings with a slider.
 */
export default function SettingSlider({
  label,
  value,
  min,
  max,
  step,
  isDisabled,
  onChange,
  onChangeEnd,
}: SettingSliderProps) {
  return (
    <SettingsComponent label={label} isDisabled={isDisabled}>
      <Slider
        my="1"
        value={value}
        min={min}
        max={max}
        step={step}
        isDisabled={isDisabled || false}
        onChange={onChange}
        onChangeEnd={onChangeEnd}
      >
        <SliderTrack>
          <SliderFilledTrack />
        </SliderTrack>
        <SliderThumb />
      </Slider>
    </SettingsComponent>
  );
}
