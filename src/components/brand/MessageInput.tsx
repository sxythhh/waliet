import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, Smile, Command } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({ value, onChange, onSend, disabled, placeholder = "Type a message..." }: MessageInputProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getText());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none min-h-[60px] max-h-[120px] overflow-y-auto px-3 py-2 text-sm focus:outline-none [&_p]:m-0',
      },
      handleKeyDown: (view, event) => {
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          onSend();
          return true;
        }
        return false;
      },
    },
  });

  // Clear editor when value is empty (after sending)
  useEffect(() => {
    if (value === '' && editor && editor.getText() !== '') {
      editor.commands.clearContent();
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-muted/20">
      <EditorContent editor={editor} />
      <div className="flex items-center justify-between px-3 pb-3 pt-1">
        <div className="flex items-center gap-0.5">
          <Button 
            type="button"
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/50"
          >
            <Smile className="h-4 w-4" />
          </Button>
          <Button 
            type="button"
            variant="ghost" 
            size="icon" 
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/50 ${editor.isActive('bold') ? 'text-foreground bg-muted/50' : ''}`}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button 
            type="button"
            variant="ghost" 
            size="icon" 
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/50 ${editor.isActive('italic') ? 'text-foreground bg-muted/50' : ''}`}
          >
            <Italic className="h-4 w-4" />
          </Button>
        </div>
        <Button 
          size="sm" 
          className="h-8 px-3 rounded-lg bg-[#2060de] hover:bg-[#1a50c0] text-white text-xs gap-1.5" 
          onClick={onSend} 
          disabled={disabled || !editor.getText().trim()}
        >
          <span className="flex items-center gap-0.5 text-white/70">
            <Command className="h-3 w-3" />
            <span className="text-[10px]">↵</span>
          </span>
          Send
        </Button>
      </div>
    </div>
  );
}