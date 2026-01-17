import { useState, useEffect, useCallback, useMemo } from 'react';
import { Play, Pause, SkipBack, SkipForward, Clock, FastForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import type { WeatherSnapshot } from '@/hooks/useWeatherSnapshots';

interface PlumePlaybackProps {
  snapshots: WeatherSnapshot[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  isPlaying: boolean;
  onPlayingChange: (playing: boolean) => void;
}

export default function PlumePlayback({
  snapshots,
  currentIndex,
  onIndexChange,
  isPlaying,
  onPlayingChange,
}: PlumePlaybackProps) {
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Auto-advance when playing
  useEffect(() => {
    if (!isPlaying || snapshots.length === 0) return;

    const interval = setInterval(() => {
      onIndexChange((currentIndex + 1) % snapshots.length);
    }, 1500 / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, currentIndex, snapshots.length, playbackSpeed, onIndexChange]);

  const currentSnapshot = snapshots[currentIndex];

  if (snapshots.length === 0) {
    return (
      <div className="bg-card/95 backdrop-blur-sm rounded-lg border border-border p-3 text-xs text-muted-foreground">
        No historical weather data available
      </div>
    );
  }

  return (
    <div className="bg-card/95 backdrop-blur-sm rounded-lg border border-border p-3 space-y-3">
      {/* Current time display */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span>Historical Playback</span>
        </div>
        {currentSnapshot && (
          <span className="font-medium text-foreground">
            {format(new Date(currentSnapshot.recorded_at), 'MMM d, HH:mm')}
          </span>
        )}
      </div>

      {/* Timeline slider */}
      <div className="space-y-1">
        <Slider
          value={[currentIndex]}
          onValueChange={([value]) => onIndexChange(value)}
          max={snapshots.length - 1}
          min={0}
          step={1}
          className="cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>
            {snapshots.length > 0 && format(new Date(snapshots[snapshots.length - 1].recorded_at), 'MMM d, HH:mm')}
          </span>
          <span>
            {snapshots.length > 0 && format(new Date(snapshots[0].recorded_at), 'MMM d, HH:mm')}
          </span>
        </div>
      </div>

      {/* Playback controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onIndexChange(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
          >
            <SkipBack className="w-3.5 h-3.5" />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPlayingChange(!isPlaying)}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onIndexChange(Math.min(snapshots.length - 1, currentIndex + 1))}
            disabled={currentIndex === snapshots.length - 1}
          >
            <SkipForward className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Speed control */}
        <div className="flex items-center gap-1.5">
          <FastForward className="w-3 h-3 text-muted-foreground" />
          <Select
            value={playbackSpeed.toString()}
            onValueChange={(v) => setPlaybackSpeed(Number(v))}
          >
            <SelectTrigger className="h-7 w-16 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0.5">0.5x</SelectItem>
              <SelectItem value="1">1x</SelectItem>
              <SelectItem value="2">2x</SelectItem>
              <SelectItem value="4">4x</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Current conditions */}
      {currentSnapshot && (
        <div className="pt-2 border-t border-border grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Wind</span>
            <p className="font-medium">
              {currentSnapshot.wind_speed_mps?.toFixed(1) ?? '-'} m/s
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Direction</span>
            <p className="font-medium">
              {currentSnapshot.wind_direction_deg ?? '-'}°
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Stability</span>
            <p className="font-medium">
              {currentSnapshot.stability_class ?? '-'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function usePlumePlayback(snapshots: WeatherSnapshot[]) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Reset to latest when snapshots change
  useEffect(() => {
    setCurrentIndex(0);
    setIsPlaying(false);
  }, [snapshots.length]);

  // Note: snapshots are ordered desc, so index 0 = latest
  // For playback, we want to go from oldest to newest
  const reversedSnapshots = useMemo(() => [...snapshots].reverse(), [snapshots]);
  const playbackIndex = useMemo(() => 
    reversedSnapshots.length - 1 - currentIndex, 
    [reversedSnapshots.length, currentIndex]
  );

  const currentSnapshot = snapshots[currentIndex] ?? null;

  return {
    snapshots,
    currentIndex,
    setCurrentIndex,
    isPlaying,
    setIsPlaying,
    currentSnapshot,
    playbackIndex,
  };
}
