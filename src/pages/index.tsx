import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Avatar, User } from "@nextui-org/react";
import PageHead from "@/components/commons/PageHead";
import Image from "next/image";
import Link from "next/link";
import Logo from "@/components/commons/Logo";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/router";
import { FaChevronDown } from "react-icons/fa6";

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();
  const isLoading = status === "loading";
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  const handleDashboardClick = () => {
    if (session?.user?.role) {
      router.push(`/${session.user.role}/dashboard`);
    }
  };
  
  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.reload();
  };
  
  return (
    <>
      <PageHead title="E-Learning - Selamat Datang" />
      
      <div className="min-h-screen w-full bg-gradient-to-b from-blue-50 to-white overflow-x-hidden">
        {/* Navigation */}
        <nav className="container mx-auto flex items-center justify-between py-4 px-4 md:px-6 lg:px-10 xl:px-16 max-w-7xl relative">
          <Logo />
          
          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button 
              onClick={toggleMenu}
              className="p-2 focus:outline-none focus:ring-2 focus:ring-blue-300 rounded-md"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            {isLoading ? (
              <div className="flex gap-4">
                <div className="h-9 w-20 bg-gray-200 animate-pulse rounded-md"></div>
                <div className="h-9 w-20 bg-gray-200 animate-pulse rounded-md"></div>
              </div>
            ) : session?.user ? (
              <Dropdown placement="bottom-end">
                <DropdownTrigger>
                  <div className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Avatar 
                      name={(session.user.fullName || session.user.name || "") as string} 
                      size="sm" 
                      src="/images/general/icon_default.png"
                      className="cursor-pointer"
                    />
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium text-gray-700">{session.user.fullName || session.user.name}</span>
                      <span className="text-xs text-gray-500 capitalize">{session.user.role}</span>
                    </div>
                    {session.user.role !== "murid" && (
                      <FaChevronDown className="ml-1 text-gray-400 text-xs" />
                    )}
                  </div>
                </DropdownTrigger>
                <DropdownMenu aria-label="User Actions">
                  <DropdownItem key="dashboard" onClick={handleDashboardClick}>
                    Masuk ke Dashboard
                  </DropdownItem>
                  <DropdownItem key="logout" className="text-danger" color="danger" onClick={handleLogout}>
                    Logout
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button color="primary" variant="light" className="min-w-0 px-4 min-w-[80px]">
                    Masuk
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button color="primary" variant="solid" className="min-w-0 px-4 min-w-[80px]">
                    Daftar
                  </Button>
                </Link>
              </>
            )}
          </div>
          
          {/* Mobile Navigation Overlay */}
          {isMenuOpen && (
            <div className="absolute top-full left-0 right-0 bg-white shadow-lg rounded-b-lg p-4 flex flex-col space-y-3 md:hidden z-50">
              {session?.user ? (
                <>
                  <div className="flex items-center gap-3 mb-2 p-2">
                    <Avatar
                      name={(session.user.fullName || session.user.name || "") as string}
                      size="sm"
                      src="/images/general/icon_default.png"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{session.user.fullName || session.user.name}</span>
                      <span className="text-xs text-gray-500 capitalize">{session.user.role}</span>
                    </div>
                  </div>
                  <button
                    className="w-full py-2 text-center text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleDashboardClick();
                    }}
                  >
                    Masuk ke Dashboard
                  </button>
                  <button
                    className="w-full py-2 text-center text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleLogout();
                    }}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link 
                    href="/auth/login" 
                    className="w-full py-2 text-center text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Masuk
                  </Link>
                  <Link 
                    href="/auth/register" 
                    className="w-full py-2 text-center bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Daftar
                  </Link>
                </>
              )}
            </div>
          )}
        </nav>

        {/* Hero Section */}
        <section className="relative isolate overflow-hidden container mx-auto px-4 py-8 sm:py-10 md:px-6 md:py-12 lg:px-10 lg:py-16 xl:px-16 max-w-7xl">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -z-10 -top-40 right-[-15%] h-[34rem] w-[34rem] rounded-full bg-gradient-radial from-blue-300/40 via-blue-200/15 to-transparent blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -z-10 inset-0 opacity-[0.18] bg-[radial-gradient(#93c5fd_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(70%_55%_at_50%_0%,black,transparent)]"
          />
          <div className="flex flex-col-reverse items-center justify-between gap-6 sm:gap-8 md:flex-row">
            <div className="flex w-full flex-col items-center text-center md:items-start md:text-left md:w-1/2 space-y-4 sm:space-y-6">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-[1.05] text-balance text-gray-800 md:text-5xl lg:text-6xl">
                Belajar Lebih Mudah dengan <span className="text-blue-500">E-Learning</span>
              </h1>
              <p className="text-base sm:text-lg text-gray-600 max-w-xl">
                Platform belajar digital yang memudahkan proses pembelajaran 
                bagi murid dan guru. Akses materi pelajaran, tugas, dan nilai dengan mudah.
              </p>
              <div className="flex flex-wrap gap-3 sm:gap-4 justify-center md:justify-start">
                {!session?.user && (
                  <Link href="/auth/register">
                    <Button color="primary" size="lg">
                      Mulai Belajar
                    </Button>
                  </Link>
                )}
                {session?.user && (
                  <Button 
                    color="primary" 
                    size="lg"
                    onClick={handleDashboardClick}
                  >
                    Ke Dashboard
                  </Button>
                )}
                <Link href="#fitur">
                  <Button color="primary" variant="bordered" size="lg">
                    Pelajari Fitur
                  </Button>
                </Link>
              </div>
            </div>
            <div className="w-full mb-8 md:mb-0 md:w-1/2 flex justify-center md:justify-end">
              <figure className="w-full max-w-xl overflow-hidden rounded-xl bg-white ring-1 ring-gray-900/5 shadow-[0_24px_60px_-15px_rgba(37,99,235,0.35)]">
                <div className="flex items-center gap-1.5 border-b border-gray-100 bg-gray-50 px-3 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
                  <div className="ml-3 h-4 flex-1 rounded border border-gray-100 bg-white" />
                </div>
                <Image
                  src="/images/general/dashboard-preview.png"
                  alt="Tampilan dashboard guru: daftar mata pelajaran yang diajar, jumlah kelas, dan catatan pengajar"
                  width={1440}
                  height={900}
                  className="w-full h-auto"
                  priority
                />
              </figure>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="fitur" className="container mx-auto px-4 py-12 sm:py-14 md:px-6 md:py-16 lg:px-10 xl:px-16 max-w-7xl">
          <h2 className="mb-8 sm:mb-10 md:mb-12 text-center text-2xl sm:text-3xl font-bold text-gray-800">Fitur Unggulan</h2>
          
          <div className="grid grid-cols-1 gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6 shadow-sm transition-all hover:shadow-md">
              <div className="mb-4 rounded-full bg-blue-100 p-3 inline-flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="mb-2 text-lg sm:text-xl font-semibold text-gray-800">Materi Pelajaran Digital</h3>
              <p className="text-sm sm:text-base text-gray-600">
                Akses berbagai materi pelajaran dalam format digital yang interaktif dan mudah dipahami.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6 shadow-sm transition-all hover:shadow-md">
              <div className="mb-4 rounded-full bg-blue-100 p-3 inline-flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h3 className="mb-2 text-lg sm:text-xl font-semibold text-gray-800">Pengelolaan Tugas</h3>
              <p className="text-sm sm:text-base text-gray-600">
                Kemudahan dalam mengerjakan, mengumpulkan, dan menilai tugas secara digital.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6 shadow-sm transition-all hover:shadow-md">
              <div className="mb-4 rounded-full bg-blue-100 p-3 inline-flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="mb-2 text-lg sm:text-xl font-semibold text-gray-800">Monitoring Nilai</h3>
              <p className="text-sm sm:text-base text-gray-600">
                Pantau perkembangan nilai dan kemajuan pembelajaran dengan dashboard yang informatif.
              </p>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="bg-blue-500 py-10 sm:py-12 md:py-16 w-full">
          <div className="container mx-auto px-4 text-center md:px-6 lg:px-10 xl:px-16 max-w-7xl">
            <h2 className="mb-4 sm:mb-6 text-2xl sm:text-3xl font-bold text-white">Siap Untuk Memulai Pembelajaran?</h2>
            <p className="mb-6 sm:mb-8 text-base sm:text-lg md:text-xl text-blue-100 max-w-lg mx-auto">
              Bergabunglah dengan E-Learning dan tingkatkan pengalaman belajar Anda sekarang!
            </p>
            {!session?.user ? (
              <Link href="/auth/register">
                <Button size="lg" className="bg-white text-blue-500 font-semibold">
                  Daftar Sekarang
                </Button>
              </Link>
            ) : (
              <Button 
                size="lg"
                className="bg-white text-blue-500 font-semibold"
                onClick={handleDashboardClick}
              >
                Ke Dashboard
              </Button>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-800 py-10 sm:py-12 w-full">
          <div className="container mx-auto px-4 md:px-6 lg:px-10 xl:px-16 max-w-7xl">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {/* School Name and Info */}
              <div className="col-span-1 lg:col-span-2">
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">E-Learning SMPN 37 Jakarta</h3>
                <p className="text-sm sm:text-base text-gray-300 mb-4">
                  Platform pembelajaran digital untuk meningkatkan kualitas pendidikan dan
                  memudahkan proses belajar mengajar.
                </p>
              </div>
              
              {/* Quick Links */}
              <div className="sm:mt-0">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Quick Links</h3>
                <ul className="space-y-2">
                  {!session?.user ? (
                    <>
                      <li>
                        <Link href="/auth/login" className="text-sm sm:text-base text-gray-300 hover:text-white transition-colors">
                          Login
                        </Link>
                      </li>
                      <li>
                        <Link href="/auth/register" className="text-sm sm:text-base text-gray-300 hover:text-white transition-colors">
                          Register
                        </Link>
                      </li>
                    </>
                  ) : (
                    <li>
                      <button 
                        onClick={handleDashboardClick}
                        className="text-sm sm:text-base text-gray-300 hover:text-white transition-colors"
                      >
                        Dashboard
                      </button>
                    </li>
                  )}
                  <li>
                    <Link href="#fitur" className="text-sm sm:text-base text-gray-300 hover:text-white transition-colors">
                      Fitur
                    </Link>
                  </li>
                </ul>
              </div>
              
              {/* Contact Info */}
              <div className="sm:mt-0">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Kontak</h3>
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-xs sm:text-sm text-gray-300">
                      Jl. Taman Wijaya Kusuma I No.8 8, RT.8/RW.4, Pd. Labu, Kec. Cilandak, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12450
                    </p>
                  </div>
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                    </svg>
                    <p className="text-xs sm:text-sm text-gray-300">(021) 7695272</p>
                  </div>
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                    <p className="text-xs sm:text-sm text-gray-300">smpn37cil@yahoo.co.id</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 sm:mt-10 md:mt-12 border-t border-gray-700 pt-6 sm:pt-8">
              <p className="text-center text-xs sm:text-sm text-gray-400">
                © {new Date().getFullYear()} E-Learning SMPN 37 Jakarta. Hak Cipta Dilindungi.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
