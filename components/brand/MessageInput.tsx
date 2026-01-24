import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Command } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const COMMON_EMOJIS = [
  '😀', '😂', '😊', '🥰', '😍', '🤩', '😎', '🤔',
  '👍', '👏', '🙌', '💪', '🔥', '✨', '💯', '❤️',
  '🎉', '🎊', '🚀', '💡', '✅', '⭐', '🌟', '💫',
  '👀', '🙏', '💰', '📈', '🎯', '💼', '🤝', '👋',
];

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({ value, onChange, onSend, disabled, placeholder = "Type a message..." }: MessageInputProps) {
  const [emojiOpen, setEmojiOpen] = useState(false);

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

  const insertEmoji = (emoji: string) => {
    if (editor) {
      editor.chain().focus().insertContent(emoji).run();
      setEmojiOpen(false);
    }
  };

  if (!editor) return null;

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-muted/20">
      <EditorContent editor={editor} />
      <div className="flex items-center justify-between px-3 pb-3 pt-1">
        <div className="flex items-center gap-0.5">
          <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/50"
              >
                <span className="material-symbols-rounded text-[18px]">sentiment_satisfied</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[280px] p-2"
              align="start"
              side="top"
              sideOffset={8}
            >
              <div className="grid grid-cols-8 gap-1">
                {COMMON_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => insertEmoji(emoji)}
                    className="h-8 w-8 flex items-center justify-center text-lg hover:bg-muted rounded-md transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/50 ${editor.isActive('bold') ? 'text-foreground bg-muted/50' : ''}`}
          >
            <span className="material-symbols-rounded text-[18px]">format_bold</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/50 ${editor.isActive('italic') ? 'text-foreground bg-muted/50' : ''}`}
          >
            <span className="material-symbols-rounded text-[18px]">format_italic</span>
          </Button>
        </div>
        <Button
          size="sm"
          className="h-8 px-3 rounded-lg bg-primary hover:bg-[#1a50c0] text-white text-xs gap-1.5"
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
