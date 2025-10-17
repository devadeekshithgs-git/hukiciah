import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/AuthProvider';
import { TRAY_CAPACITY } from '@/lib/constants';

interface TrayVisualizationProps {
  allocatedTrays: number[];
  bookedTrays: number[];
  selectedDate: Date | null;
  onNext: () => void;
  onBack: () => void;
}

export const TrayVisualization = ({
  allocatedTrays,
  bookedTrays,
  selectedDate,
  onNext,
  onBack,
}: TrayVisualizationProps) => {
  const { user } = useAuth();

  const getTrayStatus = (trayNumber: number): 'allocated' | 'booked' | 'available' => {
    if (allocatedTrays.includes(trayNumber)) return 'allocated';
    if (bookedTrays.includes(trayNumber)) return 'booked';
    return 'available';
  };

  const getTrayColor = (status: string) => {
    switch (status) {
      case 'allocated':
        return 'bg-green-500';
      case 'booked':
        return 'bg-gray-400';
      case 'available':
        return 'bg-white border-2 border-border';
      default:
        return 'bg-white';
    }
  };

  return (
    <div className="bg-card p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-foreground mb-6">Your Allocated Trays</h2>

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
            <strong>Your Trays:</strong> {allocatedTrays.join(', ')}
          </p>
        </div>
      )}

      <div className="mb-6">
        <div className="flex gap-4 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-500 rounded"></div>
            <span className="text-foreground">Your Allocated Trays</span>
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
                className={`
                  relative h-16 flex items-center justify-center rounded-md cursor-default
                  ${getTrayColor(status)}
                  transform transition-transform hover:scale-105
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

      <div className="mb-4 p-4 bg-accent/30 rounded-md">
        <p className="text-sm text-foreground">
          <strong>Note:</strong> Trays are automatically allocated. You cannot manually select trays.
        </p>
      </div>

      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1"
        >
          Back
        </Button>
        <Button
          onClick={onNext}
          className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Next: Payment
        </Button>
      </div>
    </div>
  );
};
