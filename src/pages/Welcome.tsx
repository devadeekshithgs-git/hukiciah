import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const rules = [
  'One item, up to one litre, in one tray (minimum quantity per item is one litre)',
  'All orders accepted at 1 PM daily',
  'Saturday Special: Minimum 6 trays required unless 6+ trays already booked. Saturday deliveries: Monday.',
  'Only vegetarian food accepted',
  'If sending paneer, we recommend using our freeze-dried paneer at ₹2 per gram (e.g., 250g = ₹500); homemade paneer may crumble',
  'Operations only within Bengaluru',
  'Self deliveries and self pick-ups: Customers are responsible for delivery/pickup logistics unless otherwise arranged',
];

const Welcome = () => {
  const navigate = useNavigate();
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  const handleScroll = (event: any) => {
    const target = event.target;
    if (target) {
      const isAtBottom = Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) < 10;
      if (isAtBottom && !hasScrolledToBottom) {
        setHasScrolledToBottom(true);
      }
    }
  };

  const handleAcceptAll = () => {
    sessionStorage.setItem('huki_rules_accepted', 'true');
    navigate('/booking');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary/5 to-secondary/5">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center space-y-4">
          <Logo className="mx-auto" size="lg" />
          <CardTitle className="text-3xl font-bold text-primary">
            Welcome to HUKI Food Dehydration Service
          </CardTitle>
          <p className="text-muted-foreground">
            Please review and accept the following rules:
          </p>
        </CardHeader>
        <CardContent>
          <ScrollArea 
            className="h-[400px] pr-4" 
            onScrollCapture={handleScroll}
          >
            <div className="space-y-4">
              {rules.map((rule, index) => (
                <div key={index} className="flex items-start space-x-3 p-4 rounded-lg bg-accent/30">
                  <div className="min-w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold flex-shrink-0">
                    ✓
                  </div>
                  <p className="text-sm leading-relaxed flex-1">{rule}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-4">
          <p className="text-xs text-muted-foreground text-center">
            {hasScrolledToBottom ? 'You have reviewed all the rules' : 'Scroll down to review all rules'}
          </p>
          <Button
            onClick={handleAcceptAll}
            disabled={!hasScrolledToBottom}
            size="lg"
            className="w-full max-w-xs"
          >
            Accept All Conditions & Continue
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Welcome;
