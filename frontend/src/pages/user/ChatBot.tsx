import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { whatsappApi } from '@/services/whatsappApi';

export default function ChatBot() {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  const queryClient = useQueryClient();

  // Fetch chat history from backend
  const { data: chat, isLoading } = useQuery(['chat-history'], () =>
    whatsappApi.getChatHistory().then(res => res.data)
  );

  // Send message mutation
  const sendMessageMutation = useMutation(
    (msg: string) => whatsappApi.sendMessage(msg).then(res => res.data),
    {
      onMutate: () => {
        setIsTyping(true);
      },
      onSuccess: () => {
        setMessage('');
        queryClient.invalidateQueries(['chat-history']);
        setIsTyping(false);
      },
      onError: () => {
        setIsTyping(false);
        // Handle error, e.g., show toast notification
      },
    }
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMessageMutation.mutate(message);
  };

  if (isLoading) {
    return <div>Loading chat...</div>;
  }

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col px-4 sm:px-6 lg:px-8">
      <div className="mb-4">
        <h1 className="text-base font-semibold leading-6 text-gray-900">
          WhatsApp Chat
        </h1>
        <p className="mt-2 text-sm text-gray-700">
          Chat with our bot to manage your finances in Bahasa Indonesia, including formal, informal, and slang expressions.
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
            {chat?.messages.map((msg: any) => (
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
              placeholder="Ketik pesan Anda..."
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
            />
            <button
              type="submit"
              disabled={!message.trim() || sendMessageMutation.isLoading}
              className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PaperAirplaneIcon className="h-5 w-5" />
              <span className="sr-only">Kirim pesan</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
