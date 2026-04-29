<template>
  <Teleport to="body">
    <div class="dialog-overlay" @click="$emit('cancel')">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <h3 class="dialog-title">保存文档</h3>
        </div>
        <div class="dialog-body">
          <label class="form-label">文件名</label>
          <input
            ref="inputRef"
            type="text"
            class="form-input"
            :value="filename"
            @input="$emit('update:filename', $event.target.value)"
            @keyup.enter="$emit('confirm')"
          />

          <label class="form-label form-label-top">导出格式</label>
          <select
            class="form-input"
            :value="format"
            @change="$emit('update:format', $event.target.value)"
          >
            <option value="md">Markdown (.md)</option>
            <option value="txt">纯文本 (.txt)</option>
            <option value="docx">Word 文档 (.docx)</option>
            <option value="pdf">PDF 文档 (.pdf)</option>
          </select>

          <p class="form-hint">文件将保存为 {{ formatExtensions[format] }} 格式</p>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="$emit('cancel')">
            取消
          </button>
          <button class="btn btn-primary" @click="$emit('confirm')">
            保存
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  filename: {
    type: String,
    required: true
  },
  format: {
    type: String,
    default: 'md'
  }
})

const emit = defineEmits(['update:filename', 'update:format', 'confirm', 'cancel'])

const inputRef = ref(null)

const formatExtensions = {
  md: '.md',
  txt: '.txt',
  docx: '.docx',
  pdf: '.pdf'
}

watch(() => props.filename, () => {
  nextTick(() => {
    if (inputRef.value) {
      inputRef.value.focus()
      inputRef.value.select()
    }
  })
})

watch(() => props.format, (newFormat) => {
  // Update filename extension when format changes
  let baseName = props.filename
  Object.values(formatExtensions).forEach(ext => {
    if (baseName.endsWith(ext)) {
      baseName = baseName.slice(0, -ext.length)
    }
  })
  emit('update:filename', baseName + formatExtensions[newFormat])
})
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: white;
  border-radius: 8px;
  width: 400px;
  max-width: 90vw;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.dialog-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e0e0e0;
}

.dialog-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.dialog-body {
  padding: 20px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.form-label-top {
  margin-top: 16px;
}

select.form-input {
  cursor: pointer;
  background-color: white;
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.1);
}

.form-hint {
  margin: 8px 0 0 0;
  font-size: 12px;
  color: #888;
}

.dialog-footer {
  padding: 12px 20px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  border-top: 1px solid #e0e0e0;
}

.btn {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn:hover {
  background: #f0f0f0;
}

.btn-primary {
  color: #1976d2;
  border-color: #1976d2;
}

.btn-primary:hover {
  background: #e3f2fd;
}

.btn-secondary {
  color: #666;
}
</style>
