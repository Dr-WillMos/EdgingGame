/**
 * 自定义媒体 IndexedDB 存储
 * ========================================
 * 用户上传的图片/视频持久化到浏览器本地 IndexedDB。
 * 刷新页面后不会丢失，游戏启动时自动恢复为 blob URL。
 * 使用连接缓存避免重复打开/关闭数据库连接。
 *
 * 包含两个独立存储区：
 *   - files        : 常规撸动素材（踩格子时播放）
 *   - climax_files : 通关高潮素材（到达终点时专属展示）
 */

const DB_NAME = 'cunzhi_media_db'
const STORE_NAME = 'files'
const CLIMAX_STORE_NAME = 'climax_files'
const DB_VERSION = 2

/** 连接缓存 */
let dbPromise: Promise<IDBDatabase> | null = null

export interface MediaFileRecord {
  id?: number
  name: string
  mimeType: string
  type: 'image' | 'video'
  blob: Blob
  size: number
  createdAt: number
}

/** IndexedDB 是否可用 */
function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== 'undefined'
}

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      reject(new Error('IndexedDB 不可用，自定义素材功能受限'))
      return
    }
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onerror = () => {
        dbPromise = null
        reject(req.error)
      }
      req.onblocked = () => {
        // 其他标签页持有旧版本连接，清除缓存以便后续重试
        console.warn('[mediaDB] IndexedDB 升级被阻塞，请关闭其他标签页后重试')
        dbPromise = null
      }
      req.onsuccess = () => {
        const db = req.result
        // 其他标签页升级数据库时，当前连接会收到 versionchange 事件
        db.addEventListener('versionchange', () => {
          db.close()
          dbPromise = null
        })
        resolve(db)
      }
      req.onupgradeneeded = () => {
        const db = req.result
        // 常规素材存储区（v1 已存在）
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
        }
        // 高潮素材存储区（v2 新增）
        if (!db.objectStoreNames.contains(CLIMAX_STORE_NAME)) {
          db.createObjectStore(CLIMAX_STORE_NAME, { keyPath: 'id', autoIncrement: true })
        }
      }
    } catch (e) {
      dbPromise = null
      reject(e)
    }
  })

  return dbPromise
}

/** 等待事务完成后返回结果 */
function withTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode)
        const store = tx.objectStore(storeName)
        const req = callback(store)
        req.onsuccess = () => resolve(req.result as T)
        req.onerror = () => reject(req.error)
      })
  )
}

/**
 * 创建针对指定存储区的 DB 操作对象
 * 避免常规素材与高潮素材之间的代码重复。
 */
function createMediaDBOps(storeName: string) {
  return {
    /** 添加文件，返回自增 id */
    async add(file: File): Promise<number> {
      const record: Omit<MediaFileRecord, 'id'> = {
        name: file.name,
        mimeType: file.type,
        type: file.type.startsWith('video') ? 'video' : 'image',
        blob: file,
        size: file.size,
        createdAt: Date.now(),
      }
      return withTransaction(storeName, 'readwrite', (store) => store.add(record) as IDBRequest<number>)
    },

    /** 获取全部记录 */
    async getAll(): Promise<MediaFileRecord[]> {
      return withTransaction(storeName, 'readonly', (store) => store.getAll() as IDBRequest<MediaFileRecord[]>)
    },

    /** 删除指定记录 */
    async remove(id: number): Promise<void> {
      await withTransaction(storeName, 'readwrite', (store) => store.delete(id) as IDBRequest<undefined>)
    },

    /** 清空全部 */
    async clear(): Promise<void> {
      await withTransaction(storeName, 'readwrite', (store) => store.clear() as IDBRequest<undefined>)
    },
  }
}

/** 常规撸动素材存储 */
export const mediaDB = createMediaDBOps(STORE_NAME)

/** 通关高潮素材存储（独立于常规素材） */
export const climaxMediaDB = createMediaDBOps(CLIMAX_STORE_NAME)
