import { useEffect, useMemo, useState } from 'react'
import { View, Text, ScrollView, Button, Image, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { fetchMe, patchMe, postBindEmail, postSendCode, type AuthUser } from '@/api/auth'
import { fetchMyDiyRecords, deleteDiyRecord, patchDiyRecord, uploadFile } from '@/api/services'
import { clearToken, setToken } from '@/utils/auth'
import { getAssetUrl } from '@/api/admin'
import './ProfileTab.scss'

interface Props {
  active: boolean
}

export default function ProfileTab({ active }: Props) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [diyRecords, setDiyRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [profileForm, setProfileForm] = useState({ username: '', avatar_url: '' })
  const [emailForm, setEmailForm] = useState({ email: '', code: '' })
  const [showProfileEditor, setShowProfileEditor] = useState(false)
  const [showEmailEditor, setShowEmailEditor] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [bindingEmail, setBindingEmail] = useState(false)
  const [activeRecord, setActiveRecord] = useState<any | null>(null)

  const emailLine = useMemo(() => {
    const email = user?.email
    if (!email) return '未绑定邮箱'
    if (!email.includes('@')) return email

    const [local, domain] = email.split('@')
    const masked = local.length > 2 ? `${local.slice(0, 2)}***` : `${local[0]}***`
    return `${masked}@${domain}`
  }, [user])

  const loadData = async (force = false) => {
    if (loading && !force) return

    setLoading(true)
    try {
      const me = await fetchMe()
      setUser(me)
      setProfileForm({
        username: me.username || '',
        avatar_url: me.avatar_url || '',
      })
      setEmailForm((current) => ({
        ...current,
        email: me.email || current.email || '',
        code: '',
      }))

      const guest = me.role === 'tourist' && me.username?.startsWith('访客')
      if (guest) {
        setDiyRecords([])
        return
      }

      const records = await fetchMyDiyRecords()
      setDiyRecords(records.items || [])
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (active) {
      void loadData()
    }
  }, [active])

  const logout = () => {
    clearToken()
    Taro.reLaunch({ url: '/pages/login/login' })
  }

  const goLogin = () => {
    clearToken()
    setUser(null)
    Taro.reLaunch({ url: '/pages/login/login?from=guest' })
  }

  const onDeleteDiy = async (e: any, id: number) => {
    e.stopPropagation()
    const res = await Taro.showModal({
      title: '删除记录',
      content: '确定要删除这条 DIY 记录吗？',
    })
    if (!res.confirm) return

    try {
      await deleteDiyRecord(id)
      Taro.showToast({ title: '已删除', icon: 'success' })
      void loadData(true)
    } catch {
      Taro.showToast({ title: '删除失败', icon: 'none' })
    }
  }

  const onEditDiy = async (e: any, record: any) => {
    e.stopPropagation()
    const res: any = await Taro.showModal({
      title: '修改名称',
      content: '',
      editable: true,
      placeholderText: '请输入新名称',
    } as any)

    if (!res.confirm || !res.content) return

    try {
      await patchDiyRecord(record.id, { title: res.content })
      Taro.showToast({ title: '已修改', icon: 'success' })
      void loadData(true)
    } catch {
      Taro.showToast({ title: '修改失败', icon: 'none' })
    }
  }

  const onPreviewDiy = (record: any) => {
    setActiveRecord(record)
  }

  const roleLabel = useMemo(() => {
    if (!user) return null
    if (user.role === 'admin') return '管理员'
    if (user.role === 'worker') return '工作者'
    if (user.username?.startsWith('访客')) return '访客'
    return '游客'
  }, [user])

  const isGuest = useMemo(() => user?.role === 'tourist' && user.username?.startsWith('访客'), [user])
  const showDiy = useMemo(() => Boolean(user) && !isGuest, [user, isGuest])

  const selectionSnapshot = useMemo(() => {
    const snapshot = activeRecord?.payload?.selection_snapshot
    if (Array.isArray(snapshot) && snapshot.length > 0) {
      return snapshot.map((item: any) => ({
        label: item.name || item.code || '选项',
        value: item.option_name || '未选择',
      }))
    }

    const summary = String(activeRecord?.payload?.summary || '').trim()
    if (!summary) return []
    return summary.split(',').map((item: string) => {
      const [label, ...rest] = item.split(':')
      return {
        label: (label || '选项').trim(),
        value: (rest.join(':') || '').trim() || '未选择',
      }
    })
  }, [activeRecord])

  const openProfileEditor = () => {
    if (!user) return
    setProfileForm({ username: user.username || '', avatar_url: user.avatar_url || '' })
    setShowProfileEditor(true)
  }

  const closeProfileEditor = () => {
    setShowProfileEditor(false)
    setProfileForm({ username: user?.username || '', avatar_url: user?.avatar_url || '' })
  }

  const openEmailEditor = () => {
    if (!user) return
    setEmailForm({ email: user.email || '', code: '' })
    setShowEmailEditor(true)
  }

  const closeEmailEditor = () => {
    setShowEmailEditor(false)
    setEmailForm({ email: user?.email || '', code: '' })
  }

  const saveProfile = async () => {
    const username = profileForm.username.trim()
    if (!username) {
      Taro.showToast({ title: '请输入用户名', icon: 'none' })
      return
    }

    setSavingProfile(true)
    try {
      await patchMe({
        username,
        avatar_url: profileForm.avatar_url || '',
      })
      Taro.showToast({ title: '资料已更新', icon: 'success' })
      await loadData(true)
      setShowProfileEditor(false)
    } catch {
      Taro.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      setSavingProfile(false)
    }
  }

  const chooseAvatar = async () => {
    try {
      const res = await Taro.chooseImage({ count: 1 })
      Taro.showLoading({ title: '上传中...' })
      const uploadRes = await uploadFile(res.tempFilePaths[0])
      Taro.hideLoading()
      setProfileForm((current) => ({ ...current, avatar_url: uploadRes.url }))
    } catch (err: any) {
      Taro.hideLoading()
      if (err?.errMsg?.includes('cancel')) return
      Taro.showToast({ title: '头像上传失败', icon: 'none' })
    }
  }

  const sendEmailCode = async () => {
    const email = emailForm.email.trim().toLowerCase()
    if (!email || !email.includes('@')) {
      Taro.showToast({ title: '请输入正确邮箱', icon: 'none' })
      return
    }

    setSendingCode(true)
    try {
      await postSendCode(email)
      Taro.showToast({ title: '验证码已发送', icon: 'success' })
    } catch {
      Taro.showToast({ title: '发送失败', icon: 'none' })
    } finally {
      setSendingCode(false)
    }
  }

  const bindEmail = async () => {
    const email = emailForm.email.trim().toLowerCase()
    const code = emailForm.code.trim()
    if (!email || !email.includes('@') || code.length < 4) {
      Taro.showToast({ title: '请完善邮箱和验证码', icon: 'none' })
      return
    }

    setBindingEmail(true)
    try {
      const res = await postBindEmail(email, code)
      setToken(res.token)
      setUser(res.user)
      setProfileForm((current) => ({
        ...current,
        username: res.user.username || current.username,
        avatar_url: res.user.avatar_url || current.avatar_url,
      }))
      setEmailForm({ email: res.user.email || email, code: '' })
      Taro.showToast({ title: '邮箱已绑定', icon: 'success' })
      setShowEmailEditor(false)
    } catch {
      Taro.showToast({ title: '绑定失败', icon: 'none' })
    } finally {
      setBindingEmail(false)
    }
  }

  return (
    <ScrollView
      scrollY
      className='tab-scroll profile-tab'
      showScrollbar={false}
      refresherEnabled
      refresherTriggered={loading}
      onRefresherRefresh={() => loadData(true)}
    >
      <View className='profile-header'>
        <View className='header-info'>
          <View className='avatar-row'>
            {profileForm.avatar_url ? (
              <Image className='avatar-image' src={getAssetUrl(profileForm.avatar_url)} mode='aspectFill' />
            ) : (
              <Text className='avatar'>{user?.username?.slice(0, 1) || '我'}</Text>
            )}
            {!isGuest && user && (
              <View className='header-actions'>
                <Button className='header-action-btn' onClick={openProfileEditor}>更改资料</Button>
                <Button className='header-action-btn ghost' onClick={openEmailEditor}>更换邮箱</Button>
              </View>
            )}
          </View>
          <View className='name-row'>
            <Text className='name'>{user?.username || '饶有趣用户'}</Text>
            {roleLabel && <Text className={`role-badge ${user?.role}`}>{roleLabel}</Text>}
          </View>
          <Text className='phone'>{emailLine}</Text>
          {!isGuest && <Text className='profile-tip'>资料完善后，个人中心可直接查看和管理我的方案。</Text>}
        </View>
      </View>

      {isGuest && (
        <View className='guest-banner card'>
          <Text className='guest-tip'>当前为访客登录，要体验更多内容请正式登录。</Text>
          <View className='guest-actions'>
            <Button className='guest-login-btn' onClick={goLogin}>去登录</Button>
            <Button className='guest-logout-btn' onClick={logout}>退出登录</Button>
          </View>
        </View>
      )}

      {!isGuest && showDiy && (
        <>
          <View className='stats-row'>
            <View className='stat'>
              <Text className='stat-n'>{user?.stats?.diy_count ?? 0}</Text>
              <Text className='stat-l'>我的方案</Text>
            </View>
          </View>

          <View className='section-title-row'>
            <Text className='section-title'>我的方案</Text>
            <Text className='section-subtitle'>点击卡片查看每个选项和最终预览图。</Text>
          </View>

          <View className='diy-list'>
            {diyRecords.length === 0 && !loading && (
              <View className='empty-tip'><Text>暂无保存记录</Text></View>
            )}
            {diyRecords.map((record) => (
              <View key={record.id} className='diy-card' onClick={() => onPreviewDiy(record)}>
                <Image className='diy-cover' src={getAssetUrl(record.preview_image_url)} mode='aspectFill' />
                <View className='diy-info'>
                  <Text className='diy-name'>{record.title || '未命名方案'}</Text>
                  <Text className='diy-date'>{record.created_at.split('T')[0]}</Text>
                  <Text className='diy-summary'>{record.payload?.summary || '点击查看方案详情'}</Text>
                  <View className='diy-actions'>
                    <Text className='edit-btn' onClick={(e) => onEditDiy(e, record)}>修改</Text>
                    <Text className='del-btn' onClick={(e) => onDeleteDiy(e, record.id)}>删除</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {!isGuest && (
        <>
          <View className='menu card'>
            {user && user.role !== 'tourist' && (user.role === 'worker' || user.role === 'admin') && (
              <View className='menu-item' onClick={() => Taro.navigateTo({ url: '/pages/assist/my-tasks' })}>
                我的接取任务
              </View>
            )}
          </View>
          <Button type='primary' className='logout-btn' onClick={logout}>退出登录</Button>
        </>
      )}

      {showProfileEditor && !isGuest && (
        <View className='overlay-mask' onClick={closeProfileEditor}>
          <View className='overlay-modal' onClick={(e) => e.stopPropagation()}>
            <Text className='overlay-title'>更改资料</Text>
            <View className='avatar-editor'>
              <View className='avatar-preview-wrap'>
                {profileForm.avatar_url ? (
                  <Image className='avatar-preview' src={getAssetUrl(profileForm.avatar_url)} mode='aspectFill' />
                ) : (
                  <View className='avatar-fallback'>
                    <Text>{profileForm.username.slice(0, 1) || '我'}</Text>
                  </View>
                )}
              </View>
              <Button className='secondary-action-btn' onClick={chooseAvatar}>更换头像</Button>
            </View>
            <View className='field-stack'>
              <Text className='field-caption'>用户名</Text>
              <Input
                className='profile-input'
                value={profileForm.username}
                placeholder='请输入用户名'
                onInput={(e) => setProfileForm((current) => ({ ...current, username: e.detail.value }))}
              />
            </View>
            <Button className='primary-action-btn' loading={savingProfile} onClick={saveProfile}>保存资料</Button>
            <Button className='secondary-action-btn full' onClick={closeProfileEditor}>取消</Button>
          </View>
        </View>
      )}

      {showEmailEditor && !isGuest && (
        <View className='overlay-mask' onClick={closeEmailEditor}>
          <View className='overlay-modal' onClick={(e) => e.stopPropagation()}>
            <Text className='overlay-title'>更换邮箱</Text>
            <View className='field-stack'>
              <Text className='field-caption'>新邮箱</Text>
              <Input
                className='profile-input'
                value={emailForm.email}
                placeholder='请输入邮箱'
                onInput={(e) => setEmailForm((current) => ({ ...current, email: e.detail.value }))}
              />
              <View className='code-row'>
                <Input
                  className='profile-input code-input'
                  value={emailForm.code}
                  placeholder='请输入验证码'
                  onInput={(e) => setEmailForm((current) => ({ ...current, code: e.detail.value }))}
                />
                <Button className='secondary-action-btn code-btn' loading={sendingCode} onClick={sendEmailCode}>发送验证码</Button>
              </View>
            </View>
            <Button className='primary-action-btn light' loading={bindingEmail} onClick={bindEmail}>保存邮箱</Button>
            <Button className='secondary-action-btn full' onClick={closeEmailEditor}>取消</Button>
          </View>
        </View>
      )}

      {activeRecord && (
        <View className='plan-mask' onClick={() => setActiveRecord(null)}>
          <View className='plan-modal' onClick={(e) => e.stopPropagation()}>
            <Text className='plan-title'>{activeRecord.title || '我的方案'}</Text>
            {activeRecord.preview_image_url ? (
              <Image className='plan-image' src={getAssetUrl(activeRecord.preview_image_url)} mode='aspectFill' />
            ) : null}
            <View className='plan-section'>
              <Text className='plan-section-title'>方案选项</Text>
              {selectionSnapshot.length > 0 ? (
                selectionSnapshot.map((item, index) => (
                  <View className='plan-row' key={`${item.label}-${index}`}>
                    <Text className='plan-label'>{item.label}</Text>
                    <Text className='plan-value'>{item.value}</Text>
                  </View>
                ))
              ) : (
                <Text className='plan-empty'>暂无方案明细</Text>
              )}
            </View>
            <Button className='primary-action-btn' onClick={() => setActiveRecord(null)}>关闭</Button>
          </View>
        </View>
      )}
      <View className='bottom-pad' />
    </ScrollView>
  )
}
