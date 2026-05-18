import { useEffect, useRef } from 'react';
import { Button, Popconfirm, Select, Tooltip } from 'antd';
import {
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
} from '@ant-design/icons';

import { BinAnimationIcon } from 'assets/icons';
import { ERROR_RED } from 'constants/theme';

import { useEditor, EditorContent } from '@tiptap/react';
// StarterKit v3 already bundles Underline (and Bold / Italic /
// Document / Heading / List / Paragraph / etc.), so we don't import
// `@tiptap/extension-underline` separately — doing so triggers a
// duplicate-extension error and the editor refuses to mount.
import { StarterKit } from '@tiptap/starter-kit';
import { TextAlign } from '@tiptap/extension-text-align';
// `FontSize` writes its attribute onto `textStyle`, so the
// `TextStyle` mark has to be in the extension list too. Both ship
// from `@tiptap/extension-text-style` in v3.
import { FontSize, TextStyle } from '@tiptap/extension-text-style';
import { Placeholder } from '@tiptap/extension-placeholder';

import { useCanvasStore } from '../stores/canvasStore';
import './FeatureCardText.css';

/**
 * Text-only feature card — TipTap rich-text editor with a
 * floating toolbar (Bold / Italic / Underline / Align / FontSize
 * / Delete). Each column carries its own ``html`` payload; the
 * card row itself (size + position) is mirrored across columns
 * by the normal `applyCardLayouts` fan-out, but the content is
 * **never** fanned out — each column writes its own annotation.
 *
 * Title-less by design: the editor is the card. A thin top strip
 * carries the drag handle (mirrors `CanvasMap`'s primary-tile
 * pattern); the toolbar floats outside the card just above the
 * top edge and is revealed on hover / focus (see the visibility
 * rules in `FeatureCardText.css`). The editor stays interactive
 * on every column (not just origin) because the per-column-
 * content rule is what differentiates this card type.
 *
 * Under Export View (``enableEdit === false``) the editor flips
 * to read-only, the floating toolbar (and its Delete button)
 * disappears with the drag strip, and the card's grey outline +
 * bottom padding are dropped — a clean snapshot is what's left.
 */
const FeatureCardText = ({ card, columnIndex, onDeleteCard }) => {
  const enableEdit = useCanvasStore((s) => s.enableEdit);
  const layoutLocked = useCanvasStore((s) => s.fixLayout);
  const setCardText = useCanvasStore((s) => s.setCardText);

  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        TextStyle,
        FontSize,
        Placeholder.configure({ placeholder: 'Type here…' }),
      ],
      content: card.html ?? '',
      editable: enableEdit,
      onUpdate: ({ editor: ed }) => {
        setCardText(columnIndex, card.id, ed.getHTML());
      },
    },
    // Recreate when this column's `card.id` changes (e.g. add/remove
    // text card row). `card.html` is intentionally NOT a dep — the
    // editor owns the live document and sending its own emitted
    // HTML back as `content` would reset the cursor on every keystroke.
    [columnIndex, card.id],
  );

  // Keep `editable` in lock-step with the global Export View toggle
  // without re-creating the editor instance.
  useEffect(() => {
    if (editor) editor.setEditable(enableEdit);
  }, [editor, enableEdit]);

  // External `card.html` rewrites (canvas reload, undo) need to
  // refresh the editor's document. Compare against the editor's
  // current HTML to avoid the keystroke-induced reset described
  // above; only push when the values genuinely diverge.
  const lastSyncedHtmlRef = useRef(card.html);
  useEffect(() => {
    if (!editor) return;
    if (card.html === lastSyncedHtmlRef.current) return;
    lastSyncedHtmlRef.current = card.html;
    if (editor.getHTML() !== (card.html ?? '')) {
      editor.commands.setContent(card.html ?? '', false);
    }
  }, [editor, card.html]);

  // Snapshot mode (`enableEdit === false`): drop the card's grey
  // outline and the bottom padding so the rendered text reads as
  // standalone copy on the canvas surface.
  const surfaceStyle = enableEdit ? cardStyle : cardStyleExport;
  return (
    <div style={surfaceStyle} className="cea-canvas-text-card">
      {!layoutLocked && enableEdit && (
        <div
          className="cea-card-drag-handle"
          style={dragStripStyle}
          aria-label="Drag text card"
        >
          <span style={dragGripStyle} />
        </div>
      )}
      {editor && enableEdit && (
        // Floating toolbar above the card (positioned absolutely
        // out of the card's flow). `cea-card-icon-button-container`
        // gives it the same outlined-chip chrome the rest of the
        // canvas's icon-button rows use; the visibility / hover-
        // bridge rules live in `FeatureCardText.css`.
        <div
          style={toolbarStyle}
          className="cea-canvas-text-toolbar cea-card-icon-button-container cea-no-drag"
        >
          <Toolbar editor={editor} onDeleteCard={onDeleteCard} />
        </div>
      )}
      <div style={textBodyStyle}>
        <EditorContent editor={editor} className="cea-canvas-text-editor" />
      </div>
    </div>
  );
};

const FONT_SIZE_OPTIONS = [12, 14, 16, 18, 24, 32].map((px) => ({
  label: `${px}`,
  value: `${px}px`,
}));

const Toolbar = ({ editor, onDeleteCard }) => {
  const align = ['left', 'center', 'right'].find((a) =>
    editor.isActive({ textAlign: a }),
  );
  const currentSize = editor.getAttributes('textStyle')?.fontSize || undefined;
  return (
    <>
      <Tooltip title="Bold (⌘B)" placement="top">
        <Button
          type="text"
          icon={<BoldOutlined />}
          onClick={() => editor.chain().focus().toggleBold().run()}
          style={editor.isActive('bold') ? activeBtnStyle : undefined}
          aria-label="Bold"
        />
      </Tooltip>
      <Tooltip title="Italic (⌘I)" placement="top">
        <Button
          type="text"
          icon={<ItalicOutlined />}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          style={editor.isActive('italic') ? activeBtnStyle : undefined}
          aria-label="Italic"
        />
      </Tooltip>
      <Tooltip title="Underline (⌘U)" placement="top">
        <Button
          type="text"
          icon={<UnderlineOutlined />}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          style={editor.isActive('underline') ? activeBtnStyle : undefined}
          aria-label="Underline"
        />
      </Tooltip>
      <span style={dividerStyle} />
      <Tooltip title="Align left" placement="top">
        <Button
          type="text"
          icon={<AlignLeftOutlined />}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          style={align === 'left' ? activeBtnStyle : undefined}
          aria-label="Align left"
        />
      </Tooltip>
      <Tooltip title="Align center" placement="top">
        <Button
          type="text"
          icon={<AlignCenterOutlined />}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          style={align === 'center' ? activeBtnStyle : undefined}
          aria-label="Align center"
        />
      </Tooltip>
      <Tooltip title="Align right" placement="top">
        <Button
          type="text"
          icon={<AlignRightOutlined />}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          style={align === 'right' ? activeBtnStyle : undefined}
          aria-label="Align right"
        />
      </Tooltip>
      <span style={dividerStyle} />
      <Select
        size="small"
        style={{ width: 64 }}
        value={currentSize}
        placeholder="Size"
        options={FONT_SIZE_OPTIONS}
        onChange={(value) => {
          if (value) editor.chain().focus().setFontSize(value).run();
          else editor.chain().focus().unsetFontSize().run();
        }}
      />
      {onDeleteCard && (
        // `marginLeft: auto` floats the delete button to the
        // right edge of the toolbar. The toolbar's chip class
        // already provides the chrome, so the button sits naked
        // (no nested wrapper) and inherits the 30 × 30 sizing.
        <Popconfirm
          title="Delete this card?"
          description="The text in every column will be removed."
          okText="Delete"
          cancelText="Cancel"
          okButtonProps={{ danger: true }}
          onConfirm={onDeleteCard}
        >
          <Tooltip title="Delete card" placement="top">
            <Button
              type="text"
              icon={<BinAnimationIcon style={{ color: ERROR_RED }} />}
              style={deleteBtnStyle}
              aria-label="Delete card"
            />
          </Tooltip>
        </Popconfirm>
      )}
    </>
  );
};

// Mirrors `featureCardCommon.cardStyle` but skips the title row's
// padding because the body owns the entire interior.
const cardStyle = {
  width: '100%',
  height: '100%',
  background: '#fff',
  border: '1px solid #e8e8e8',
  borderRadius: 12,
  padding: '4px 12px 12px',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
};

// Export-view variant: no border, no bottom padding. The card
// becomes invisible chrome around the rendered text fragment.
const cardStyleExport = {
  ...cardStyle,
  border: 'none',
  padding: '4px 12px 0',
};

// Thin draggable strip at the top — same affordance the primary
// map tile uses when there's no title row to grab.
const dragStripStyle = {
  height: 12,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'grab',
  flexShrink: 0,
};

const dragGripStyle = {
  width: 28,
  height: 3,
  borderRadius: 999,
  background: 'rgba(148, 163, 184, 0.6)',
};

// Pushes the delete button to the right edge of the toolbar row so
// it sits side-by-side with the formatting controls instead of
// overlapping them.
const deleteBtnStyle = {
  marginLeft: 'auto',
};

const textBodyStyle = {
  flex: 1,
  minHeight: 0,
  width: '100%',
  overflow: 'auto',
  fontSize: 14,
  lineHeight: 1.4,
};

// `cea-card-icon-button-container` (HomePage.css) provides the
// flex / centering / 3 px padding / outlined chip chrome. Here we
// float the toolbar *above* the card via absolute positioning so
// the editor body can use the full card height. Visibility is
// driven by the `cea-canvas-text-card:hover / :focus-within` rules
// in `FeatureCardText.css`.
const toolbarStyle = {
  position: 'absolute',
  // 6 px visual lift between the toolbar and the card. CSS adds
  // a `::after` pseudo-element bridging the gap so the cursor
  // doesn't lose `:hover` when moving from card to toolbar.
  bottom: 'calc(100% + 6px)',
  // `left: 0` + `right: 0` stretches the toolbar to the same
  // width as the card. The delete button's `marginLeft: auto`
  // then floats right against the card's far edge.
  left: 0,
  right: 0,
  zIndex: 10,
  background: '#fff',
  gap: 2,
  flexShrink: 0,
};

const activeBtnStyle = {
  background: 'rgba(0,0,0,0.06)',
};

const dividerStyle = {
  width: 1,
  height: 18,
  background: '#e0e0e0',
  margin: '0 2px',
};

export default FeatureCardText;
