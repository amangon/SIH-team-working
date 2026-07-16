import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { getAccessToken } from '@/services/api';

const SocketContext = createContext({ socket: null, online: new Set() });
export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [online, setOnline] = useState(new Set());

  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocket(null);
      return;
    }

    const s = io('/', { auth: { token: getAccessToken() } });
    socketRef.current = s;
    setSocket(s);

    s.on('presence:online', ({ userId }) =>
      setOnline((prev) => new Set(prev).add(userId)));
    s.on('presence:offline', ({ userId }) =>
      setOnline((prev) => { const n = new Set(prev); n.delete(userId); return n; }));

    // Realtime notifications invalidate the notifications query
    s.on('notification:new', () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });
    s.on('activity:new', () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    });

    return () => s.disconnect();
  }, [user, queryClient]);

  return (
    <SocketContext.Provider value={{ socket, online }}>
      {children}
    </SocketContext.Provider>
  );
}
