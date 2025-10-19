import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

const rules = [
  'One item, up to one litre, in one tray (minimum quantity per item is one litre)',
  'All orders accepted at 1 PM daily',
  'Saturday Special: Minimum 6 trays required unless 6+ trays already booked. Saturday deliveries: Monday.',
  'Only vegetarian food accepted',
  'If sending paneer, we recommend using our freeze-dried paneer; homemade paneer may crumble',
  'Operations only within Bengaluru',
  'Self deliveries and self pick-ups: Customers are responsible for delivery/pickup logistics unless otherwise arranged',
];

const Welcome = () => {
  const [checkedRules, setCheckedRules] = useState<boolean[]>(new Array(rules.length).fill(false));
  const [countdown, setCountdown] = useState(60);
  const navigate = useNavigate();

  const allChecked = checkedRules.every(Boolean);

  useEffect(() => {
    if (countdown > 0 && !allChecked) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && allChecked) {
      sessionStorage.setItem('huki_rules_accepted', 'true');
      navigate('/booking');
    }
  }, [countdown, allChecked, navigate]);

  const handleCheckChange = (index: number, checked: boolean) => {
    const newChecked = [...checkedRules];
    newChecked[index] = checked;
    setCheckedRules(newChecked);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Logo size="xl" className="mb-8" />
      
      <div className="w-full max-w-2xl bg-card p-8 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
          Welcome to HUKI Food Dehydration Service
        </h2>

        <div className="space-y-4 mb-6">
          <p className="text-foreground font-medium">Please review and accept the following rules:</p>
          
          {rules.map((rule, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 bg-accent/30 rounded-md">
              <Checkbox
                id={`rule-${index}`}
                checked={checkedRules[index]}
                onCheckedChange={(checked) => handleCheckChange(index, checked as boolean)}
              />
              <label
                htmlFor={`rule-${index}`}
                className="text-sm text-foreground cursor-pointer leading-relaxed"
              >
                {rule}
              </label>
            </div>
          ))}
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            {allChecked 
              ? `Auto-proceeding in ${countdown} seconds...`
              : 'Please check all boxes to continue'}
          </p>
          
          <Button
            onClick={() => {
              // Set flag in sessionStorage and navigate
              sessionStorage.setItem('huki_rules_accepted', 'true');
              navigate('/booking');
            }}
            disabled={!allChecked}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Continue to Booking
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
