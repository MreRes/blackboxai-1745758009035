import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';

// Mock data for initial development
const mockData = {
  messages: [
    {
      id: '1',
      content: 'Show me my recent transactions',
      sender: 'USER',
      timestamp: '2023-10-05T10:00:00Z',
    },
    {
      id: '2',
      content: 'Here are your recent transactions:\n\n1. Food - $25.00\n2. Transportation - $15.00\n3. Coffee - $5.00',
      sender: 'BOT',
      timestamp: '2023-10-05T10:00:05Z',
    },
    {
      id: '3',
      content: 'What\'s my current balance?',
      sender: 'USER',
      timestamp: '2023-10-05T10:01:00Z',
    },
    {
      id: '4',
      content: 'Your current balance is $3,500.00',
      sender: 'BOT',
      timestamp: '2023-10-05T10:01:05Z',
    },
  ],
  isConnected: true,
};

export default function ChatBot() {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);

  // TODO: Replace with actual API calls
  const { data: chat } = useQuery(['chat-history'], () =>
    Promise.resolve(mockData)
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat?.messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    // TODO: Implement message sending
    setMessage('');
    setIsTyping(true);
    setTimeout(() => setIsTyping(false), 2000);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col px-4 sm:px-6 lg:px-8">
      <div className="mb-4">
        <h1 className="text-base font-semibold leading-6 text-gray-900">
          WhatsApp Chat
        </h1>
        <p className="mt-2 text-sm text-gray-700">
          Chat with our bot to manage your finances
        </p>
      </div>

      <div className="relative flex flex-1 flex-col rounded-lg bg-white shadow">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-6">
          <div className="flex items-center">
            <div
              className={`mr-2 h-2 w-2 rounded-full ${
                chat?.isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-sm font-medium text-gray-900">
              {chat?.isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="space-y-4">
            {chat?.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.sender === 'USER' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`rounded-lg px-4 py-2 ${
                    msg.sender === 'USER'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="whitespace-pre-line text-sm">{msg.content}</p>
                  <p
                    className={`mt-1 text-xs ${
                      msg.sender === 'USER'
                        ? 'text-primary-100'
                        : 'text-gray-500'
                    }`}
                  >
                    {format(new Date(msg.timestamp), 'HH:mm')}
                  </p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="rounded-lg bg-gray-100 px-4 py-2">
                  <div className="flex space-x-1">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                    <div
                      className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                      style={{ animationDelay: '0.2s' }}
                    />
                    <div
                      className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                      style={{ animationDelay: '0.4s' }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="border-t border-gray-200 px-4 py-3 sm:px-6">
          <form onSubmit={handleSubmit} className="flex space-x-4">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
            />
            <button
              type="submit"
              disabled={!message.trim()}
              className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PaperAirplaneIcon className="h-5 w-5" />
              <span className="sr-only">Send message</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
