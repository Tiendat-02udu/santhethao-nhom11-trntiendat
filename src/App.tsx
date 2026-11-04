import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import {
  ArrowDownUp, ArrowLeft, ArrowRight, Bell, CalendarDays, Check, ChevronDown,
  ChevronLeft, ChevronRight, Clock3, Compass, Heart, LayoutDashboard, LogOut,
  MapPin, Menu, Plus, Search, Settings, ShieldCheck, SlidersHorizontal, Sparkles,
  Star, TicketCheck, Trophy, UserRound, Users, Wallet, X,
} from 'lucide-react'
import { Link, Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { useAuth } from './auth-context'
import { useBookingStore, type Booking } from './store'
import { apiRequest, toBookingView, toVenueView, type ApiVenue, type VenueView } from './api'
import './App.css'
import './dark-theme.css'

type Venue = VenueView
type OutletData = { venues: Venue[]; setVenues: (updater: (previous: Venue[]) => Venue[]) => void }

const venues: Venue[] = [
  { id: '1', name: 'Sân bóng Thành Công', type: 'Bóng đá', area: 'Đống Đa', address: '12 Nguyễn Lương Bằng, Đống Đa, Hà Nội', price: 350000, rating: 4.9, reviews: 128, image: 'https://images.unsplash.com/photo-1459865264687-595d652de67e?auto=format&fit=crop&w=1200&q=85', tag: 'Được yêu thích', openSlots: 8, courts: 5, description: 'Cụm sân cỏ nhân tạo tiêu chuẩn, mặt sân êm và hệ thống chiếu sáng hiện đại. Phù hợp cho những trận cầu sôi động cùng bạn bè.' },
  { id: '2', name: 'Pickleball The Yard', type: 'Pickleball', area: 'Cầu Giấy', address: '86 Trần Thái Tông, Cầu Giấy, Hà Nội', price: 180000, rating: 4.8, reviews: 96, image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=85', tag: 'Mới mở', openSlots: 12, courts: 4, description: 'Không gian pickleball trong nhà thoáng mát, trang bị đầy đủ vợt và bóng cho người mới bắt đầu.' },
  { id: '3', name: 'Tennis Green Park', type: 'Tennis', area: 'Tây Hồ', address: 'Khu đô thị Ciputra, Tây Hồ, Hà Nội', price: 260000, rating: 4.7, reviews: 74, image: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1200&q=85', tag: 'Sân đẹp', openSlots: 6, courts: 3, description: 'Sân tennis ngoài trời giữa khuôn viên xanh, mặt sân chuẩn thi đấu và có khu vực nghỉ ngơi.' },
  { id: '4', name: 'Cầu lông Smash Zone', type: 'Cầu lông', area: 'Hai Bà Trưng', address: '25 Minh Khai, Hai Bà Trưng, Hà Nội', price: 90000, rating: 4.8, reviews: 113, image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=85', tag: 'Giá tốt', openSlots: 10, courts: 8, description: 'Nhà thi đấu cầu lông có điều hòa, sàn gỗ chống trượt và không gian thân thiện.' },
]
const times = ['06:00', '07:30', '09:00', '15:00', '16:30', '18:00', '19:30', '21:00']
const money = (value: number) => new Intl.NumberFormat('vi-VN').format(value) + 'đ'
const toDateValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const today = () => toDateValue(new Date())
const now = new Date()
const welcomeDate = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now).toLocaleUpperCase('vi-VN')
const greeting = now.getHours() < 12 ? 'Chào buổi sáng' : now.getHours() < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'
const getDateAtOffset = (offset: number) => {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return date
}
const makeBookingId = () => `${Date.now()}`
const endTime = (time: string, durationHours = 1) => {
  const [hours, minutes] = time.split(':').map(Number)
  const end = hours * 60 + minutes + durationHours * 60
  return `${String(Math.floor(end / 60) % 24).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`
}

function App() {
  return <Routes><Route element={<AppShell />}>
    <Route index element={<Dashboard />} />
    <Route path="venues" element={<VenueList />} />
    <Route path="venues/:id" element={<VenueDetail />} />
    <Route path="bookings" element={<Bookings />} />
    <Route path="favorites" element={<Favorites />} />
    <Route path="owner" element={<RequireOwner><OwnerDashboard /></RequireOwner>} />
    <Route path="login" element={<Login />} />
    <Route path="*" element={<Dashboard />} />
  </Route></Routes>
}
function RequireOwner({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  return user.role === 'owner' ? children : <Navigate to="/login" replace />
}
function useAppData() {
  return useOutletContext<OutletData>()
}

function AppShell() {
  const { user, token, logout } = useAuth()
  const location = useLocation()
  const [mobileNav, setMobileNav] = useState(false)
  const [venueList, setVenueList] = useState(venues)
  const [apiNotice, setApiNotice] = useState('')
  const replaceBookings = useBookingStore((state) => state.replaceBookings)
  const upcomingBookings = useBookingStore((state) => state.bookings.filter((booking) => booking.status === 'confirmed').length)
  const currentPage = location.pathname.startsWith('/venues/') ? 'Chi tiết sân'
    : location.pathname === '/venues' ? 'Tìm sân'
      : location.pathname === '/bookings' ? 'Lịch đặt sân'
        : location.pathname === '/favorites' ? 'Sân yêu thích'
          : location.pathname === '/owner' ? 'Quản lý sân'
            : location.pathname === '/login' ? 'Đăng nhập' : 'Khám phá'
  useEffect(() => {
    let active = true
    apiRequest<{ data: ApiVenue[] }>('/venues')
      .then(({ data }) => {
        if (!active) return
        if (data.length) {
          setVenueList(data.map(toVenueView))
          setApiNotice('')
        } else {
          setApiNotice('API đã kết nối nhưng chưa có sân — đang hiển thị dữ liệu demo. Hãy chạy npm run seed.')
        }
      })
      .catch((error: unknown) => {
        if (active) setApiNotice(`Đang dùng dữ liệu demo — không kết nối được API: ${error instanceof Error ? error.message : 'Lỗi không xác định.'}`)
      })
    return () => { active = false }
  }, [])
  useEffect(() => {
    if (!token) return
    let active = true
    apiRequest<{ data: Parameters<typeof toBookingView>[0][] }>('/bookings', { token })
      .then(({ data }) => { if (active) replaceBookings(data.map(toBookingView)) })
      .catch((error: unknown) => {
        if (active) setApiNotice(`Không tải được lịch đặt từ máy chủ: ${error instanceof Error ? error.message : 'Lỗi không xác định.'}`)
      })
    return () => { active = false }
  }, [token, replaceBookings])
  const links = [
    { to: '/', label: 'Khám phá', icon: Compass, end: true },
    { to: '/venues', label: 'Tìm sân', icon: MapPin },
    { to: '/bookings', label: 'Lịch đặt sân', icon: CalendarDays },
    { to: '/favorites', label: 'Sân yêu thích', icon: Heart },
  ]
  return <div className="app-layout">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <Link to="/" className="brand"><span className="brand-mark"><Trophy size={21} strokeWidth={2.5} /></span><span>san<span className="brand-highlight">go</span></span><span className="brand-dot">.</span></Link>
      <div className="workspace-label">KHÔNG GIAN CỦA BẠN</div>
      <nav className="side-nav">
        {links.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} onClick={() => setMobileNav(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Icon size={19} /><span>{label}</span>{label === 'Lịch đặt sân' && <span className="nav-count">{upcomingBookings}</span>}</NavLink>)}
      </nav>
      <div className="sidebar-separator" />
      <div className="workspace-label">DÀNH CHO CHỦ SÂN</div>
      <NavLink to="/owner" onClick={() => setMobileNav(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><LayoutDashboard size={19} /><span>Quản lý sân</span></NavLink>
      <div className="sidebar-bottom">
        <div className="upgrade-card"><span className="upgrade-icon"><Sparkles size={16} /></span><b>Thể thao vui hơn khi có hội!</b><p>Rủ bạn bè, chia sẻ trận đấu ngay nhé.</p><button onClick={() => navigator.clipboard?.writeText(window.location.origin)} className="invite-button">Mời bạn bè <ArrowRight size={14} /></button></div>
        <button className="nav-link sidebar-settings"><Settings size={19} /><span>Cài đặt</span></button>
        <div className="profile-row"><div className="avatar">{user.name.split(' ').slice(-1)[0].slice(0, 1)}</div><div className="profile-copy"><b>{user.name}</b><span>{user.role === 'owner' ? 'Chủ sân' : 'Thành viên'}</span></div><button title="Đăng xuất" className="icon-button" onClick={logout}><LogOut size={17} /></button></div>
      </div>
    </aside>
    <main className="main-area">
      <header className="topbar"><button className="icon-button mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Mở menu"><Menu size={21} /></button><div className="breadcrumb"><span>Trang chủ</span><ChevronRight size={15} /><b>{currentPage}</b></div><div className="topbar-right"><button className="icon-button notification-button" aria-label="Thông báo"><Bell size={19} /><i /></button><div className="topbar-divider" /><div className="top-user"><div className="avatar avatar-small">{user.name.slice(-1)}</div><ChevronDown size={15} /></div></div></header>
      <div className="page-content">{apiNotice && <div role="status" className="api-notice">{apiNotice}</div>}<Outlet context={{ venues: venueList, setVenues: setVenueList }} /></div>
    </main>
    {mobileNav && <button className="nav-scrim" onClick={() => setMobileNav(false)} aria-label="Đóng menu" />}
  </div>
}
function PageTitle({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-title"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>
}

function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { venues: venueList } = useAppData()
  const { bookings, favorites } = useBookingStore()
  const [query, setQuery] = useState('')
  const [sport, setSport] = useState('Tất cả môn')
  const active = bookings.filter((b) => b.status === 'confirmed').length
  const suggestions = venueList.filter((v) => (sport === 'Tất cả môn' || v.type === sport) && `${v.name} ${v.area} ${v.type}`.toLowerCase().includes(query.toLowerCase())).slice(0, 3)
  return <div className="dashboard-page">
    <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-dot" /> {welcomeDate}</div><h1>{greeting}, {user.name.split(' ').slice(-1)[0]} <span className="wave">✦</span></h1><p>Sẵn sàng cho một trận đấu thật đã chưa?</p></div><Link to="/bookings" className="outline-button"><CalendarDays size={17} /> Lịch của tôi</Link></section>
    <section className="hero-banner"><div className="hero-overlay" /><div className="hero-copy"><span className="hero-kicker"><Sparkles size={14} /> SÂN CHẤT, TRẬN HAY</span><h2>Trận đấu hay<br />bắt đầu từ đây.</h2><p>Tìm sân thể thao yêu thích và đặt lịch chỉ trong vài giây.</p><button onClick={() => navigate('/venues')} className="hero-button">Khám phá sân <ArrowRight size={17} /></button><div className="hero-proof"><div className="proof-avatars"><span>H</span><span>M</span><span>K</span><span>+</span></div><span>Được tin dùng bởi <b>2.400+</b> người chơi</span></div></div><div className="hero-badge"><span className="badge-star"><Star size={15} fill="currentColor" /></span><div><b>4.9/5</b><span>Đánh giá người chơi</span></div></div></section>
    <section className="stat-grid">
      <StatCard icon={<TicketCheck size={19} />} label="Lượt đặt sân" value={`${bookings.length + 12}`} trend="+12%" tone="mint" />
      <StatCard icon={<CalendarDays size={19} />} label="Lịch sắp tới" value={`${active + 2}`} trend="Sắp diễn ra" tone="blue" />
      <StatCard icon={<Heart size={19} />} label="Sân yêu thích" value={`${favorites.length + 3}`} trend="Đã lưu" tone="pink" />
      <StatCard icon={<Wallet size={19} />} label="Đã tiết kiệm" value="320.000đ" trend="Tháng này" tone="amber" />
    </section>
    <section className="section-block">
      <div className="section-heading"><div><div className="eyebrow">CHỌN MÔN, TÌM SÂN</div><h2>Tìm sân gần bạn</h2></div><Link to="/venues" className="text-link">Xem tất cả <ArrowRight size={16} /></Link></div>
      <div className="search-panel"><div className="search-field"><Search size={19} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tên sân, khu vực..." /><span className="search-shortcut">⌘ K</span></div><div className="search-divider" /><div className="select-field"><Trophy size={18} /><select value={sport} onChange={(e) => setSport(e.target.value)}><option>Tất cả môn</option><option>Bóng đá</option><option>Pickleball</option><option>Tennis</option><option>Cầu lông</option></select><ChevronDown size={15} /></div><button className="search-submit" onClick={() => navigate(`/venues${query ? `?search=${encodeURIComponent(query)}` : ''}`)}><Search size={17} /><span>Tìm sân</span></button></div>
    </section>
    <section className="section-block recommended-section"><div className="section-heading"><div><div className="eyebrow">ĐƯỢC YÊU THÍCH NHẤT</div><h2>Sân nổi bật hôm nay <span className="heading-sparkle">✦</span></h2></div><Link to="/venues" className="text-link">Khám phá thêm <ArrowRight size={16} /></Link></div><div className="venue-grid">{suggestions.map((v) => <VenueCard key={v.id} venue={v} />)}</div></section>
    <section className="bottom-promo"><div className="promo-icon"><Users size={20} /></div><div><b>Đang tìm đồng đội?</b><p>Kết nối với cộng đồng thể thao gần bạn.</p></div><button className="promo-link" onClick={() => navigate('/venues')}>Tìm trận cùng chơi <ArrowRight size={15} /></button></section>
  </div>
}

function StatCard({ icon, label, value, trend, tone }: { icon: ReactNode; label: string; value: string; trend: string; tone: string }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><span className="stat-label">{label}</span><div className="stat-bottom"><b>{value}</b><span className={`stat-trend ${tone}`}>{trend}</span></div></div>
}

function VenueCard({ venue, compact = false }: { venue: Venue; compact?: boolean }) {
  const { favorites, toggleFavorite } = useBookingStore()
  const isFavorite = favorites.includes(venue.id)
  return <article className={`venue-card ${compact ? 'compact-card' : ''}`}><div className="venue-image-wrap"><Link to={`/venues/${venue.id}`}><img src={venue.image} alt={venue.name} /></Link><span className="venue-tag">{venue.tag}</span><button aria-label={isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'} className={`favorite-button ${isFavorite ? 'is-favorite' : ''}`} onClick={() => toggleFavorite(venue.id)}><Heart size={17} fill={isFavorite ? 'currentColor' : 'none'} /></button></div><div className="venue-card-body"><div className="venue-meta"><span>{venue.type}</span><i />{venue.area}</div><Link to={`/venues/${venue.id}`} className="venue-name">{venue.name}</Link><div className="venue-rating"><Star size={14} fill="currentColor" /><b>{venue.rating}</b><span>({venue.reviews} đánh giá)</span></div><div className="venue-card-footer"><div><b>{money(venue.price)}</b><span> / giờ</span></div><Link to={`/venues/${venue.id}`} aria-label={`Xem ${venue.name}`} className="card-arrow"><ArrowRight size={17} /></Link></div></div></article>
}

function VenueList() {
  const { venues: venueList } = useAppData()
  const [search, setSearch] = useState(new URLSearchParams(location.search).get('search') ?? '')
  const [type, setType] = useState('Tất cả')
  const [area, setArea] = useState('Tất cả khu vực')
  const filtered = venueList.filter((v) => (type === 'Tất cả' || v.type === type) && (area === 'Tất cả khu vực' || v.area === area) && `${v.name} ${v.area} ${v.type}`.toLowerCase().includes(search.toLowerCase()))
  return <><PageTitle eyebrow="SÂN THỂ THAO QUANH BẠN" title="Tìm sân phù hợp" description="Chọn môn thể thao, khám phá sân chất lượng và đặt lịch trong vài thao tác." action={<button className="outline-button filter-button"><SlidersHorizontal size={17} /> Bộ lọc</button>} /><div className="listing-toolbar"><div className="list-search"><Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm tên sân, khu vực..." /></div><select value={type} onChange={(e) => setType(e.target.value)}><option>Tất cả</option><option>Bóng đá</option><option>Pickleball</option><option>Tennis</option><option>Cầu lông</option></select><select value={area} onChange={(e) => setArea(e.target.value)}><option>Tất cả khu vực</option>{['Đống Đa', 'Cầu Giấy', 'Tây Hồ', 'Hai Bà Trưng'].map((a) => <option key={a}>{a}</option>)}</select><button title="Sắp xếp" className="outline-button sort-button"><ArrowDownUp size={17} /></button></div><div className="results-caption"><span><b>{filtered.length} sân</b> phù hợp với bạn</span><span><MapPin size={14} /> Hà Nội, Việt Nam</span></div>{filtered.length ? <div className="venue-grid listing-grid">{filtered.map((venue) => <VenueCard key={venue.id} venue={venue} />)}</div> : <EmptyState title="Chưa tìm thấy sân phù hợp" description="Thử thay đổi từ khóa hoặc bộ lọc của bạn." />}</>
}

function VenueDetail() {
  const { id = '1' } = useParams()
  const { venues: venueList } = useAppData()
  const navigate = useNavigate()
  const { addBooking, bookings, favorites, toggleFavorite } = useBookingStore()
  const { token } = useAuth()
  const [apiError, setApiError] = useState('')
  const venue = venueList.find((item) => item.id === id) ?? venueList[0] ?? venues[0]
  const [date, setDate] = useState(today)
  const [slot, setSlot] = useState('')
  const [booked, setBooked] = useState(false)
  const [serverAvailability, setServerAvailability] = useState<{ venueId: string; date: string; booked: { time: string; durationHours: number }[] } | null>(null)
  useEffect(() => {
    if (!token || !/^[a-f\d]{24}$/i.test(venue.id)) return
    let active = true
    apiRequest<{ booked: { time: string; durationHours: number }[] }>(`/venues/${venue.id}/availability?date=${encodeURIComponent(date)}`, { token })
      .then(({ booked: currentBookings }) => { if (active) setServerAvailability({ venueId: venue.id, date, booked: currentBookings }) })
      .catch((error: unknown) => {
        if (active) setApiError(error instanceof Error ? error.message : 'Không thể tải lịch trống.')
      })
    return () => { active = false }
  }, [date, token, venue.id])
  const serverOccupied = serverAvailability?.venueId === venue.id && serverAvailability.date === date ? serverAvailability.booked : []
  const occupied = times.filter((time) => {
    const [hour, minute] = time.split(':').map(Number)
    const slotStart = hour * 60 + minute
    const overlaps = (startTime: string, durationHours = 1) => {
      const [startHour, startMinute] = startTime.split(':').map(Number)
      const start = startHour * 60 + startMinute
      return start < slotStart + 60 && start + durationHours * 60 > slotStart
    }
    return bookings.some((booking) => booking.venueId === venue.id && booking.date === date && booking.status === 'confirmed' && overlaps(booking.time))
      || serverOccupied.some((booking) => overlaps(booking.time, booking.durationHours))
  })
  const submit = async () => {
    if (!slot) return
    setApiError('')
    try {
      if (token) {
        const result = await apiRequest<{ data: Parameters<typeof toBookingView>[0] }>('/bookings', {
          method: 'POST',
          token,
          body: { venueId: venue.id, date, time: slot },
        })
        addBooking(toBookingView(result.data))
      } else {
        const newBooking: Booking = { id: makeBookingId(), venueId: venue.id, venueName: venue.name, venueImage: venue.image, area: venue.area, date, time: slot, price: venue.price, durationHours: 1, status: 'confirmed', sport: venue.type }
        addBooking(newBooking)
      }
      setBooked(true)
      setSlot('')
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Không thể tạo lịch đặt.')
    }
  }
  return <><button className="back-link" onClick={() => navigate(-1)}><ArrowLeft size={17} /> Quay lại danh sách</button><div className="detail-layout"><div className="detail-main"><div className="detail-cover"><img src={venue.image} alt={venue.name} /><span className="detail-cover-tag"><Star size={14} fill="currentColor" /> {venue.rating} · {venue.reviews} đánh giá</span></div><div className="detail-heading"><div><span className="eyebrow">{venue.type.toUpperCase()} · {venue.area.toUpperCase()}</span><h1>{venue.name}</h1><p><MapPin size={16} /> {venue.address}</p></div><button className="outline-button" onClick={() => toggleFavorite(venue.id)}><Heart size={17} fill={favorites.includes(venue.id) ? 'currentColor' : 'none'} /> {favorites.includes(venue.id) ? 'Đã lưu' : 'Lưu sân'}</button></div><div className="detail-divider" /><h2 className="detail-section-title">Về sân này</h2><p className="detail-description">{venue.description}</p><div className="amenities"><span><ShieldCheck size={17} /> Sân đạt chuẩn</span><span><Clock3 size={17} /> Mở cửa 06:00 – 23:00</span><span><Users size={17} /> {venue.courts} sân</span></div><div className="detail-divider" /><h2 className="detail-section-title">Chọn ngày & khung giờ</h2><div className="date-picker"><button aria-label="Ngày trước"><ChevronLeft size={17} /></button>{[0, 1, 2, 3, 4].map((offset) => { const d = getDateAtOffset(offset); const value = toDateValue(d); return <button key={value} onClick={() => { setDate(value); setBooked(false) }} className={date === value ? 'date-active' : ''}><small>{offset === 0 ? 'Hôm nay' : d.toLocaleDateString('vi-VN', { weekday: 'short' })}</small><b>{d.getDate()}</b><small>Th{d.getMonth() + 1}</small></button> })}<button aria-label="Ngày tiếp theo"><ChevronRight size={17} /></button></div><div className="slot-grid">{times.map((time) => { const disabled = occupied.includes(time); return <button key={time} disabled={disabled} onClick={() => setSlot(time)} className={`time-slot ${slot === time ? 'slot-active' : ''} ${disabled ? 'slot-busy' : ''}`}><span>{time}</span><small>{disabled ? 'Đã đặt' : money(venue.price)}</small></button> })}</div></div><aside className="booking-card"><div className="booking-card-label">ĐẶT SÂN TRỰC TUYẾN</div><div className="booking-price"><b>{money(venue.price)}</b><span>/ giờ</span></div><p className="booking-card-note"><Check size={15} /> Miễn phí hủy trước 2 giờ</p><div className="booking-summary"><div><span>Ngày đặt</span><b>{new Date(`${date}T00:00:00`).toLocaleDateString('vi-VN')}</b></div><div><span>Khung giờ</span><b>{slot || 'Chưa chọn'}</b></div></div>{apiError && <div className="api-error" role="alert">{apiError}</div>}{booked && <div className="success-message"><Check size={16} /> Đặt sân thành công! Xem trong lịch của bạn.</div>}<button disabled={!slot} className="primary-button book-button" onClick={submit}>Đặt sân ngay <ArrowRight size={17} /></button><div className="secure-note"><ShieldCheck size={15} /> Thanh toán an toàn tại sân</div></aside></div></>
}

function Bookings() {
  const { bookings, cancelBooking } = useBookingStore()
  const { token } = useAuth()
  const [tab, setTab] = useState<'all' | 'confirmed' | 'cancelled'>('all')
  const [apiError, setApiError] = useState('')
  const shown = bookings.filter((b) => tab === 'all' || b.status === tab)
  const handleCancel = async (id: string) => {
    try {
      setApiError('')
      if (token) await apiRequest(`/bookings/${id}/cancel`, { method: 'PATCH', token })
      cancelBooking(id)
      return true
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Không thể hủy lịch đặt.')
      return false
    }
  }
  return <><PageTitle eyebrow="THỜI GIAN CỦA BẠN" title="Lịch đặt sân" description="Quản lý lịch chơi sắp tới và xem lại các trận đấu của bạn." action={<Link to="/venues" className="primary-button"><Plus size={17} /> Đặt sân mới</Link>} />{apiError && <div role="alert" className="api-error page-error">{apiError}</div>}<div className="tabs-row">{[['all', 'Tất cả'], ['confirmed', 'Sắp tới'], ['cancelled', 'Đã hủy']].map(([value, label]) => <button key={value} className={`tab-button ${tab === value ? 'tab-active' : ''}`} onClick={() => setTab(value as typeof tab)}>{label}</button>)}</div><div className="booking-list">{shown.map((booking) => <BookingRow key={booking.id} booking={booking} onCancel={() => handleCancel(booking.id)} />)}{!shown.length && <EmptyState title="Chưa có lịch đặt sân" description="Tìm sân yêu thích và bắt đầu lên lịch chơi nhé." />}</div></>
}
function BookingRow({ booking, onCancel }: { booking: Booking; onCancel: () => Promise<boolean> }) {
  const [confirming, setConfirming] = useState(false)
  return <article className="booking-row"><img src={booking.venueImage} alt={booking.venueName} /><div className="booking-info"><div className="booking-sport">{booking.sport} <i /> {booking.area}</div><h3>{booking.venueName}</h3><div className="booking-meta"><span><CalendarDays size={15} /> {new Date(`${booking.date}T00:00:00`).toLocaleDateString('vi-VN')}</span><span><Clock3 size={15} /> {booking.time} – {endTime(booking.time, booking.durationHours)}</span></div></div><div className="booking-row-right"><span className={`status-pill ${booking.status}`}>{booking.status === 'confirmed' ? 'Đã xác nhận' : 'Đã hủy'}</span><b>{money(booking.price)}</b>{booking.status === 'confirmed' && (confirming ? <div className="cancel-confirm"><button onClick={async () => { if (await onCancel()) setConfirming(false) }}>Xác nhận hủy</button><button onClick={() => setConfirming(false)}>Để sau</button></div> : <button className="cancel-link" onClick={() => setConfirming(true)}>Hủy lịch</button>)}</div></article>
}

function Favorites() {
  const { favorites } = useBookingStore()
  const { venues: venueList } = useAppData()
  const saved = venueList.filter((venue) => favorites.includes(venue.id))
  return <><PageTitle eyebrow="ĐÃ LƯU CHO SAU" title="Sân yêu thích" description="Những địa điểm bạn muốn quay lại chơi." action={<Link to="/venues" className="outline-button"><Compass size={17} /> Khám phá sân</Link>} />{saved.length ? <div className="venue-grid listing-grid">{saved.map((venue) => <VenueCard key={venue.id} venue={venue} />)}</div> : <EmptyState title="Chưa có sân yêu thích" description="Chạm vào biểu tượng trái tim ở sân bạn thích để lưu lại nhé." />}</>
}

function OwnerDashboard() {
  const [period, setPeriod] = useState('7 ngày qua')
  const { venues: venueList, setVenues } = useAppData()
  const { token } = useAuth()
  const bookings = useBookingStore((state) => state.bookings)
  const [showCreate, setShowCreate] = useState(false)
  const [createError, setCreateError] = useState('')
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState({ name: '', sport: 'Bóng đá', area: '', address: '', description: '', price: '', imageUrl: '', courtCount: '1' })
  const confirmed = bookings.filter((booking) => booking.status === 'confirmed')
  const revenue = confirmed.reduce((sum, booking) => sum + booking.price, 0)
  const addVenue = async (event: FormEvent) => {
    event.preventDefault()
    setCreateError('')
    setNotice('')
    const body = { ...form, pricePerHour: Number(form.price), courtCount: Number(form.courtCount) }
    try {
      let venue: Venue
      if (token) {
        const result = await apiRequest<{ data: ApiVenue }>('/venues', { method: 'POST', token, body })
        venue = toVenueView(result.data)
      } else {
        venue = {
          id: makeBookingId(), name: form.name, type: form.sport, area: form.area, address: form.address,
          price: Number(form.price), rating: 5, reviews: 0,
          image: form.imageUrl || venues[0].image, tag: 'Sân mới', openSlots: 0,
          courts: Number(form.courtCount), description: form.description,
        }
      }
      setVenues((previous) => [venue, ...previous])
      setForm({ name: '', sport: 'Bóng đá', area: '', address: '', description: '', price: '', imageUrl: '', courtCount: '1' })
      setShowCreate(false)
      setNotice('Đã thêm sân thành công.')
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Không thể thêm sân.')
    }
  }
  return <>
    <PageTitle eyebrow="TỔNG QUAN KINH DOANH" title="Quản lý sân" description="Theo dõi hoạt động và lịch đặt sân của bạn." action={<button className="primary-button" onClick={() => setShowCreate(true)}><Plus size={17} /> Thêm sân mới</button>} />
    {notice && <div className="success-message owner-notice"><Check size={16} /> {notice}</div>}
    <div className="owner-stats">
      <StatCard icon={<Wallet size={19} />} label="Doanh thu (lịch hiện có)" value={money(revenue)} trend="Đã xác nhận" tone="mint" />
      <StatCard icon={<CalendarDays size={19} />} label="Lượt đặt sân" value={`${bookings.length}`} trend={`${confirmed.length} sắp tới`} tone="blue" />
      <StatCard icon={<MapPin size={19} />} label="Sân đang quản lý" value={`${venueList.length}`} trend="Địa điểm" tone="pink" />
      <StatCard icon={<Star size={19} />} label="Đánh giá trung bình" value="4,9" trend="Tuyệt vời" tone="amber" />
    </div>
    <section className="owner-panel">
      <div className="panel-heading"><div><h2>Doanh thu theo thời gian</h2><p>Biểu đồ mẫu cho giao diện quản lý</p></div><select value={period} onChange={(e) => setPeriod(e.target.value)}><option>7 ngày qua</option><option>30 ngày qua</option><option>90 ngày qua</option></select></div>
      <div className="chart-area"><div className="chart-y-labels"><span>4tr</span><span>3tr</span><span>2tr</span><span>1tr</span><span>0</span></div><div className="chart-content"><div className="chart-grid-lines"><i /><i /><i /><i /><i /></div><div className="chart-bars">{[48, 62, 42, 75, 58, 90, 68, 84, 55, 74, 96, 71].map((height, i) => <div className="bar-col" key={i}><div className={`bar ${i === 10 ? 'bar-highlight' : ''}`} style={{ height: `${height}%` }} title={`${height * 40000}đ`} /></div>)}</div><div className="chart-x-labels"><span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span></div></div></div><div className="chart-legend"><i /> Doanh thu</div>
    </section>
    <section className="owner-panel owner-bookings">
      <div className="panel-heading"><div><h2>Lịch đặt gần đây</h2><p>Đơn đặt sân của khách hàng</p></div><Link to="/bookings" className="text-link">Xem tất cả <ArrowRight size={15} /></Link></div>
      <div className="owner-table"><div className="table-head"><span>KHÁCH HÀNG</span><span>SÂN / THỜI GIAN</span><span>TRẠNG THÁI</span><span>THANH TOÁN</span></div>{confirmed.slice(0, 5).map((booking, i) => <div className="table-row" key={booking.id}><span className="customer-cell"><div className={`avatar table-avatar avatar-${i % 3}`}>{(booking.customerName ?? 'Khách')[0]}</div><b>{booking.customerName ?? 'Khách đặt sân'}</b></span><span><b>{booking.venueName}</b><small>{new Date(`${booking.date}T00:00:00`).toLocaleDateString('vi-VN')} · {booking.time}</small></span><span><span className="status-pill confirmed">Đã xác nhận</span></span><b>{money(booking.price)}</b></div>)}</div>
      {!confirmed.length && <EmptyState title="Chưa có lịch đặt" description="Lịch đặt của khách sẽ xuất hiện tại đây." />}
    </section>
    {showCreate && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCreate(false) }}><section className="venue-modal" role="dialog" aria-modal="true" aria-labelledby="create-venue-title"><div className="modal-heading"><div><span className="eyebrow">THÊM ĐỊA ĐIỂM MỚI</span><h2 id="create-venue-title">Thông tin sân</h2></div><button className="icon-button" aria-label="Đóng" onClick={() => setShowCreate(false)}><X size={19} /></button></div><form className="venue-form" onSubmit={addVenue}><label>Tên sân<input required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><div className="form-two-col"><label>Môn thể thao<select value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })}><option>Bóng đá</option><option>Pickleball</option><option>Tennis</option><option>Cầu lông</option></select></label><label>Khu vực<input required value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} /></label></div><label>Địa chỉ<input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label><div className="form-two-col"><label>Giá mỗi giờ (đ)<input type="number" min="0" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label><label>Số sân con<input type="number" min="1" required value={form.courtCount} onChange={(e) => setForm({ ...form, courtCount: e.target.value })} /></label></div><label>Ảnh đại diện (URL)<input type="url" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} /></label><label>Mô tả<textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>{createError && <div className="api-error" role="alert">{createError}</div>}<div className="modal-actions"><button type="button" className="outline-button" onClick={() => setShowCreate(false)}>Đóng</button><button type="submit" className="primary-button"><Plus size={16} /> Thêm sân</button></div></form></section></div>}
  </>
}

function Login() {
  const { login, loginDemo } = useAuth()
  const navigate = useNavigate()
  const [role, setRole] = useState<'player' | 'owner'>('player')
  const [email, setEmail] = useState('player@sango.vn')
  const [password, setPassword] = useState('demo12345')
  const [loginError, setLoginError] = useState('')
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setLoginError('')
    try {
      const signedInUser = await login(email, password)
      navigate(signedInUser.role === 'owner' ? '/owner' : '/')
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Đăng nhập thất bại.')
    }
  }
  const demoLogin = () => {
    loginDemo(email, role)
    navigate(role === 'owner' ? '/owner' : '/')
  }
  return <div className="login-wrap"><div className="login-card"><Link to="/" className="brand login-brand"><span className="brand-mark"><Trophy size={21} /></span><span>san<span className="brand-highlight">go</span></span><span className="brand-dot">.</span></Link><div className="eyebrow">CHÀO MỪNG BẠN QUAY TRỞ LẠI</div><h1>Đăng nhập</h1><p className="login-subtitle">Vào sân nhanh, cuộc vui bắt đầu.</p><div className="role-picker"><button type="button" className={role === 'player' ? 'role-active' : ''} onClick={() => setRole('player')}><UserRound size={17} /> Người chơi</button><button type="button" className={role === 'owner' ? 'role-active' : ''} onClick={() => setRole('owner')}><LayoutDashboard size={17} /> Chủ sân</button></div><form onSubmit={submit}><label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label><label>Mật khẩu<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label><button className="primary-button login-submit">Đăng nhập <ArrowRight size={17} /></button></form>{loginError && <div className="api-error" role="alert">{loginError}</div>}<p className="login-demo">Tài khoản mẫu: player@sango.vn / owner@sango.vn · demo12345</p><button className="demo-button" onClick={demoLogin}>Dùng thử giao diện demo</button><Link to="/" className="back-home"><ArrowLeft size={15} /> Quay về trang chủ</Link></div><div className="login-decoration"><div className="login-orbit orbit-one" /><div className="login-orbit orbit-two" /><div className="login-decoration-copy"><span><Sparkles size={15} /> CHƠI THỂ THAO DỄ DÀNG</span><h2>Tìm sân hay.<br />Chơi hết mình.</h2><p>Mọi trận đấu tuyệt vời đều bắt đầu bằng một cuộc hẹn.</p></div><div className="login-quote">“Ra sân thôi!” <span>— Cộng đồng Sango</span></div></div></div>
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="empty-state"><div><Search size={22} /></div><h3>{title}</h3><p>{description}</p><Link to="/venues" className="text-link">Khám phá sân <ArrowRight size={15} /></Link></div>
}

export default App
