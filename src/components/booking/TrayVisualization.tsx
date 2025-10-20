import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/AuthProvider';
import { TRAY_CAPACITY } from '@/lib/constants';
import { toast } from 'sonner';

interface TrayVisualizationProps {
  allocatedTrays: number[];
  bookedTrays: number[];
  selectedDate: Date | null;
  totalTraysNeeded: number;
  onNext: () => void;
  onBack: () => void;
  setAllocatedTrays: (trays: number[]) => void;
}

export const TrayVisualization = ({
  allocatedTrays,
  bookedTrays,
  selectedDate,
  totalTraysNeeded,
  onNext,
  onBack,
  setAllocatedTrays,
}: TrayVisualizationProps) => {
  const { user } = useAuth();
  const [manualMode, setManualMode] = useState(false);
  const [selectedTrays, setSelectedTrays] = useState<number[]>(allocatedTrays);

  const getTrayStatus = (trayNumber: number): 'selected' | 'booked' | 'available' => {
    if (manualMode) {
      if (selectedTrays.includes(trayNumber)) return 'selected';
      if (bookedTrays.includes(trayNumber)) return 'booked';
      return 'available';
    } else {
      if (allocatedTrays.includes(trayNumber)) return 'selected';
      if (bookedTrays.includes(trayNumber)) return 'booked';
      return 'available';
    }
  };

  const getTrayColor = (status: string) => {
    switch (status) {
      case 'selected':
        return 'bg-green-500';
      case 'booked':
        return 'bg-gray-400';
      case 'available':
        return 'bg-white border-2 border-border hover:border-primary';
      default:
        return 'bg-white';
    }
  };

  const handleTrayClick = (trayNumber: number) => {
    if (!manualMode) return;
    
    const status = getTrayStatus(trayNumber);
    
    if (status === 'booked') {
      toast.error('This tray is already booked');
      return;
    }

    if (status === 'selected') {
      setSelectedTrays(selectedTrays.filter(t => t !== trayNumber));
    } else {
      if (selectedTrays.length >= totalTraysNeeded) {
        toast.error(`You can only select ${totalTraysNeeded} trays`);
        return;
      }
      setSelectedTrays([...selectedTrays, trayNumber].sort((a, b) => a - b));
    }
  };

  const handleConfirmManualSelection = () => {
    if (selectedTrays.length !== totalTraysNeeded) {
      toast.error(`Please select exactly ${totalTraysNeeded} trays`);
      return;
    }
    setAllocatedTrays(selectedTrays);
    setManualMode(false);
    toast.success('Trays selected successfully');
  };

  const handleCancelManualSelection = () => {
    setSelectedTrays(allocatedTrays);
    setManualMode(false);
  };

  const currentTrays = manualMode ? selectedTrays : allocatedTrays;

  return (
    <div className="bg-card p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-foreground mb-6">
        {manualMode ? 'Select Your Trays' : 'Your Allocated Trays'}
      </h2>

      {selectedDate && (
        <div className="mb-6 p-4 bg-accent/30 rounded-md">
          <p className="text-sm text-foreground">
            <strong>Date:</strong> {selectedDate.toLocaleDateString('en-IN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
          <p className="text-sm text-foreground mt-2">
            <strong>{manualMode ? 'Selected' : 'Your'} Trays:</strong> {currentTrays.length > 0 ? currentTrays.join(', ') : 'None'}
          </p>
        </div>
      )}

      <div className="mb-6">
        <div className="flex gap-4 mb-4 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-500 rounded"></div>
            <span className="text-foreground">{manualMode ? 'Selected' : 'Your Allocated'} Trays</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-400 rounded"></div>
            <span className="text-foreground">Booked by Others</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white border-2 border-border rounded"></div>
            <span className="text-foreground">Available</span>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-3">
          {Array.from({ length: TRAY_CAPACITY }, (_, i) => i + 1).map((trayNumber) => {
            const status = getTrayStatus(trayNumber);
            return (
              <div
                key={trayNumber}
                onClick={() => handleTrayClick(trayNumber)}
                className={`
                  relative h-16 flex items-center justify-center rounded-md transition-all
                  ${getTrayColor(status)}
                  ${manualMode && status === 'available' ? 'cursor-pointer hover:scale-105' : ''}
                  ${manualMode && status === 'booked' ? 'cursor-not-allowed opacity-60' : ''}
                  ${!manualMode ? 'cursor-default' : ''}
                `}
                style={{
                  clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)'
                }}
              >
                <span className={`text-lg font-bold ${
                  status === 'available' ? 'text-foreground' : 'text-white'
                }`}>
                  {trayNumber}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {!manualMode && (
        <div className="mb-4 p-4 bg-accent/30 rounded-md">
          <p className="text-sm text-foreground">
            <strong>Note:</strong> Trays have been automatically allocated. You can switch to manual selection if you prefer specific tray numbers.
          </p>
        </div>
      )}

      {manualMode && (
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <p className="text-sm text-foreground">
            <strong>Manual Selection Mode:</strong> Click on available trays to select them. You need to select {totalTraysNeeded} trays. Currently selected: {selectedTrays.length}
          </p>
        </div>
      )}

      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1"
        >
          Back
        </Button>
        
        {!manualMode ? (
          <>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedTrays(allocatedTrays);
                setManualMode(true);
              }}
              className="flex-1"
            >
              Select Manually
            </Button>
            <Button
              onClick={onNext}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Next: Payment
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              onClick={handleCancelManualSelection}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmManualSelection}
              disabled={selectedTrays.length !== totalTraysNeeded}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Confirm Selection
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
