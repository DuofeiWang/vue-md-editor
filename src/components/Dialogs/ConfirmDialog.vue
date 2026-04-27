<template>
  <Teleport to="body">
    <div class="dialog-overlay" @click="$emit('cancel')">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <h3 class="dialog-title">{{ title }}</h3>
        </div>
        <div class="dialog-body">
          <p>{{ message }}</p>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="$emit('cancel')">
            {{ cancelText }}
          </button>
          <button class="btn btn-primary" @click="$emit('confirm')">
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: '确认'
  },
  message: {
    type: String,
    required: true
  },
  confirmText: {
    type: String,
    default: '确认'
  },
  cancelText: {
    type: String,
    default: '取消'
  }
})

defineEmits(['confirm', 'cancel'])
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

.dialog-body p {
  margin: 0;
  color: #555;
  line-height: 1.5;
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
