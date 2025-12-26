import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, Smile } from 'lucide-react';
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
      <div className="flex items-center justify-between px-2 pb-2 pt-0.5">
        <div className="flex items-center gap-0.5">
          <Button 
            type="button"
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 text-muted-foreground/60 hover:text-foreground hover:bg-transparent"
          >
            <Smile className="h-3.5 w-3.5" />
          </Button>
          <Button 
            type="button"
            variant="ghost" 
            size="icon" 
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`h-6 w-6 text-muted-foreground/60 hover:text-foreground hover:bg-transparent ${editor.isActive('bold') ? 'text-foreground' : ''}`}
          >
            <Bold className="h-3.5 w-3.5" />
          </Button>
          <Button 
            type="button"
            variant="ghost" 
            size="icon" 
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`h-6 w-6 text-muted-foreground/60 hover:text-foreground hover:bg-transparent ${editor.isActive('italic') ? 'text-foreground' : ''}`}
          >
            <Italic className="h-3.5 w-3.5" />
          </Button>
        </div>
        <Button 
          size="sm" 
          className="h-6 px-3 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium" 
          onClick={onSend} 
          disabled={disabled || !editor.getText().trim()}
        >
          Send
        </Button>
      </div>
    </div>
  );
}