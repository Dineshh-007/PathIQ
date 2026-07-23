'use client';

import { useEffect, useRef, useState } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';

interface CodeEditorProps {
  roomId: string;
  userId: string;
  userName: string;
  userColor?: string;
  language: string;
  onCodeChange?: (code: string) => void;
}

const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001/yjs';

export default function CodeEditor({
  roomId,
  userId,
  userName,
  userColor = '#FF0000',
  language,
  onCodeChange
}: CodeEditorProps) {
  const monaco = useMonaco();
  const editorRef = useRef<any>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Initialize Yjs and bindings when editor is ready
  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    // A Yjs document holds the shared data
    const ydoc = new Y.Doc();
    
    // Connect to our backend y-websocket server
    const provider = new WebsocketProvider(
      WEBSOCKET_URL,
      `coding-room-${roomId}`,
      ydoc
    );

    // Set awareness (cursor and user details)
    provider.awareness.setLocalStateField('user', {
      name: userName,
      color: userColor
    });

    provider.on('status', (event: { status: string }) => {
      setIsConnected(event.status === 'connected');
    });

    // The shared text type
    const ytext = ydoc.getText('monaco');

    // Bind Yjs to Monaco
    const binding = new MonacoBinding(
      ytext,
      editor.getModel(),
      new Set([editor]),
      provider.awareness
    );

    providerRef.current = provider;
    bindingRef.current = binding;

    // Trigger local onChange
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
    <div className="w-full h-full relative border border-gray-700 rounded-lg overflow-hidden bg-[#1e1e1e]">
      {/* Connection Status indicator */}
      <div className="absolute top-2 right-4 z-10 flex items-center gap-2 text-xs">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-gray-400 font-mono">
          {isConnected ? 'Sync: Connected' : 'Sync: Disconnected'}
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
          padding: { top: 32 }
        }}
        onMount={handleEditorDidMount}
        loading={
          <div className="flex h-full items-center justify-center text-gray-500">
            Loading Editor...
          </div>
        }
      />
    </div>
  );
}
