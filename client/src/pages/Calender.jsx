import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CalendarListPage() {
  const [date, setDate] = useState(new Date());
  const [inputValue, setInputValue] = useState('');

  // Mock list of items
  const listItems = [
    'Complete project proposal',
    'Team meeting at 2 PM',
    'Review code changes',
    'Submit expense report',
    'Call with client',
  ];

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-3 gap-4 mb-4">
        <Card className="col-span-2 h-80">
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
          </CardHeader>
          <iframe 
          src="https://calendar.google.com/calendar/embed?height=400&wkst=1&ctz=Asia%2FKolkata&showPrint=0&showTz=0&src=cm9kcmlndWVzcml2YTExMzBAZ21haWwuY29t&src=Y19jbGFzc3Jvb201MmY4MzJiNUBncm91cC5jYWxlbmRhci5nb29nbGUuY29t&color=%23039BE5&color=%230047a8"
            style={{
              border: 'solid 1px #777',
              width: '100%',
              height: '600px'
            }}
            frameBorder="0" 
            scrolling="no"
          />
        </Card>
        <Card className="col-span-1 h-[calc(100vh-4rem)]">
          <CardHeader>
            <CardTitle>Chatbot</CardTitle>
          </CardHeader>
            <div className="h-[calc(100vh-12rem)] border rounded-md p-4 overflow-auto">
              <p>Chatbot interface goes here...</p>
            </div>
          <div className="mt-4">
        <Input
          type="text"
          placeholder="Enter your text here..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
      </div>
        </Card>
      </div>
      
    </div>
  );
}
