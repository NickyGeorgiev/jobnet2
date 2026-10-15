import { useEffect } from 'react'
import { useEditor, EditorContent, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { mergeAttributes } from '@tiptap/core'
import { BulletList } from '@tiptap/extension-list'
import './RichTextEditor.css'

// Списък с отметки (✓) — същият <ul>, но с клас "check-list".
// Класът е единственият атрибут, който SSR санитайзерът пропуска (lib/richText.ts).
const CheckList = BulletList.extend({
  name: 'checkList',
  parseHTML() {
    // priority > 50, за да печели пред обикновения <ul> на bulletList
    return [{ tag: 'ul.check-list', priority: 100 }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['ul', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { class: 'check-list' }), 0]
  },
  addCommands() {
    return {
      toggleCheckList: () => ({ commands }) =>
        commands.toggleList(this.name, this.options.itemTypeName, this.options.keepMarks)
    }
  },
  addKeyboardShortcuts() {
    return {}
  },
  addInputRules() {
    return []
  }
})

const extensions = [
  StarterKit.configure({
    heading: { levels: [3] },
    // Изключваме всичко, което не искаме в обява (линкове, цитати, код и т.н.)
    link: false,
    blockquote: false,
    code: false,
    codeBlock: false,
    strike: false,
    trailingNode: false,
    listKeymap: {
      listTypes: [{ itemName: 'listItem', wrapperNames: ['bulletList', 'orderedList', 'checkList'] }]
    }
  }),
  CheckList
]

export function RichTextEditor({ value, onChange, disabled = false }) {
  const editor = useEditor({
    extensions,
    content: value || '',
    editable: !disabled,
    onUpdate: ({ editor }) => onChange(editor.getHTML())
  })

  // Когато описанието се зареди отвън (редакция на съществуваща обява)
  useEffect(() => {
    if (!editor) return
    if ((value || '') !== editor.getHTML()) {
      // addToHistory: false — иначе първото "Назад" след зареждане би изчистило описанието
      editor.chain().setMeta('addToHistory', false).setContent(value || '', { emitUpdate: false }).run()
    }
  }, [value, editor])

  useEffect(() => {
    if (editor) editor.setEditable(!disabled)
  }, [disabled, editor])

  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor?.isActive('bold') ?? false,
      italic: editor?.isActive('italic') ?? false,
      underline: editor?.isActive('underline') ?? false,
      heading: editor?.isActive('heading', { level: 3 }) ?? false,
      bulletList: editor?.isActive('bulletList') ?? false,
      orderedList: editor?.isActive('orderedList') ?? false,
      checkList: editor?.isActive('checkList') ?? false,
      canUndo: editor?.can().undo() ?? false,
      canRedo: editor?.can().redo() ?? false
    })
  })

  if (!editor) return null

  const buttons = [
    { key: 'undo', label: '↶', title: 'Назад', disabled: !active.canUndo, run: () => editor.chain().focus().undo().run() },
    { key: 'redo', label: '↷', title: 'Напред', disabled: !active.canRedo, run: () => editor.chain().focus().redo().run() },
    { key: 'bold', label: 'Б', title: 'Удебелен', style: { fontWeight: 700 }, run: () => editor.chain().focus().toggleBold().run() },
    { key: 'italic', label: 'К', title: 'Курсив', style: { fontStyle: 'italic' }, run: () => editor.chain().focus().toggleItalic().run() },
    { key: 'underline', label: 'П', title: 'Подчертан', style: { textDecoration: 'underline' }, run: () => editor.chain().focus().toggleUnderline().run() },
    { key: 'heading', label: 'Подзаглавие', title: 'Подзаглавие', run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { key: 'bulletList', label: '• Списък', title: 'Списък с точки', run: () => editor.chain().focus().toggleBulletList().run() },
    { key: 'orderedList', label: '1. Списък', title: 'Номериран списък', run: () => editor.chain().focus().toggleOrderedList().run() },
    { key: 'checkList', label: '✓ Списък', title: 'Списък с отметки', run: () => editor.chain().focus().toggleCheckList().run() },
    { key: 'hr', label: '―', title: 'Разделителна линия', disabled: active.bulletList || active.orderedList || active.checkList, run: () => editor.chain().focus().setHorizontalRule().run() }
  ]

  return (
    <div className={`rte${disabled ? ' rte--disabled' : ''}`}>
      <div className="rte-toolbar">
        {buttons.map(b => (
          <button
            key={b.key}
            type="button"
            title={b.title}
            disabled={disabled || b.disabled}
            className={`rte-btn${active[b.key] ? ' rte-btn--active' : ''}`}
            style={b.style}
            onMouseDown={e => e.preventDefault()}
            onClick={b.run}
          >
            {b.label}
          </button>
        ))}
      </div>
      <EditorContent editor={editor} className="rte-content" />
    </div>
  )
}
