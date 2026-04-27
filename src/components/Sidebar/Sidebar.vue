<template>
  <div class="sidebar" v-if="toc.length > 0">
    <div class="sidebar-header">
      <span class="sidebar-title">📑 目录</span>
    </div>
    <div class="sidebar-content">
      <div
        v-for="item in toc"
        :key="item.id"
        :class="['toc-item', `toc-level-${item.level}`, { active: activeId === item.id }]"
        @click="handleClick(item)"
      >
        {{ item.text }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { extractTOC } from '@/utils/markdown'

const props = defineProps({
  content: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['navigate'])

const toc = ref([])
const activeId = ref('')

// 提取目录
watch(() => props.content, () => {
  toc.value = extractTOC(props.content)
}, { immediate: true })

// 点击目录项
function handleClick(item) {
  activeId.value = item.id
  emit('navigate', item)
}

// 设置当前激活项
function setActive(id) {
  activeId.value = id
}

defineExpose({ setActive })
</script>

<style scoped>
.sidebar {
  width: 240px;
  height: 100%;
  border-right: 1px solid #e0e0e0;
  background: #fafafa;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  height: 44px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #e0e0e0;
}

.sidebar-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.toc-item {
  padding: 4px 16px;
  font-size: 14px;
  color: #555;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toc-item:hover {
  background: #e3f2fd;
  color: #1976d2;
}

.toc-item.active {
  background: #e3f2fd;
  color: #1976d2;
  font-weight: 500;
}

.toc-level-1 {
  padding-left: 16px;
}

.toc-level-2 {
  padding-left: 32px;
}

.toc-level-3 {
  padding-left: 48px;
}

.toc-level-4 {
  padding-left: 64px;
}

.toc-level-5 {
  padding-left: 80px;
}

.toc-level-6 {
  padding-left: 96px;
}
</style>
