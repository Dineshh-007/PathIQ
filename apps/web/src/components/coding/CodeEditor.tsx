'use client';

import { useEffect, useRef, useState } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from '@/utils/y-monaco';

interface CodeEditorProps {
  roomId: string;
  userId: string;
  userName: string;
  userColor?: string;
  language: string;
  onCodeChange?: (code: string) => void;
}

function getWebsocketUrl() {
  if (process.env.NEXT_PUBLIC_WEBSOCKET_URL) return process.env.NEXT_PUBLIC_WEBSOCKET_URL;
  const baseUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL;
  if (baseUrl) {
    const wsUrl = baseUrl.replace(/^http/, 'ws');
    return `${wsUrl.replace(/\/$/, '')}/yjs`;
  }
  return 'ws://localhost:3001/yjs';
}

export default function CodeEditor({
  roomId,
  userId,
  userName,
  userColor = '#3b82f6',
  language,
  onCodeChange
}: CodeEditorProps) {
  const monaco = useMonaco();
  const editorRef = useRef<any>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    const ydoc = new Y.Doc();
    const wsUrl = getWebsocketUrl();
    
    const provider = new WebsocketProvider(
      wsUrl,
      `coding-room-${roomId}`,
      ydoc
    );

    provider.awareness.setLocalStateField('user', {
      name: userName,
      color: userColor
    });

    provider.on('status', (event: { status: string }) => {
      setIsConnected(event.status === 'connected');
    });

    const ytext = ydoc.getText('monaco');

    const binding = new MonacoBinding(
      ytext,
      editor.getModel(),
      new Set([editor]),
      provider.awareness
    );

    providerRef.current = provider;
    bindingRef.current = binding;

    ytext.observe(() => {
      if (onCodeChange) {
        onCodeChange(ytext.toString());
      }
    });
  };

  useEffect(() => {
    return () => {
      bindingRef.current?.destroy();
      providerRef.current?.destroy();
    };
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#1e1e1e', overflow: 'hidden' }}>
      {/* Connection Status indicator */}
      <div style={{ position: 'absolute', top: 10, right: 16, zIndex: 10, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', background: 'rgba(0,0,0,0.6)', padding: '4px 10px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: isConnected ? '#10b981' : '#ef4444', boxShadow: isConnected ? '0 0 6px #10b981' : '0 0 6px #ef4444' }} />
        <span style={{ color: 'var(--color-text-subtle)', fontFamily: 'monospace' }}>
          {isConnected ? 'Yjs Sync: Live' : 'Yjs Sync: Connecting...'}
        </span>
      </div>

      <Editor
        height="100%"
        language={language}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          wordWrap: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 36 }
        }}
        onMount={handleEditorDidMount}
        loading={
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-subtle)', fontSize: '0.9rem' }}>
            Loading Editor...
          </div>
        }
      />
    </div>
  );
}
