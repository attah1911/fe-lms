import { BiTask } from "react-icons/bi";
import { CiGrid41, CiSettings, CiUser } from "react-icons/ci";
import { FaChalkboardTeacher } from "react-icons/fa";
import { FaBook } from "react-icons/fa6";
import { GoChecklist } from "react-icons/go";
import { MdOutlineManageAccounts } from "react-icons/md";
import { PiStudent } from "react-icons/pi";

const SIDEBAR_MURID = [
    {
        key: "dashboard",
        label: "Dashboard",
        href: "/murid/dashboard",
        icon: <CiGrid41 />,
    },
    {
        key: "matapelajaran",
        label: "Mata Pelajaran",
        href: "/murid/matapelajaran",
        icon: <FaBook />,
    },
    {
        key: "tugas",
        label: "Tugas",
        href: "/murid/tugas",
        icon: <BiTask />,
    },
    {
        key: "setting",
        label: "Setting",
        href: "/murid/setting",
        icon: <CiSettings />,
    },
];

const SIDEBAR_ADMIN = [
    {
        key: "dashboard",
        label: "Dashboard",
        href: "/admin/dashboard",
        icon: <CiGrid41 />,
    },
    {
        key: "dataakun",
        label: "Data Akun",
        href: "/admin/dataakun",
        icon: <MdOutlineManageAccounts />,
    },
    {
        key: "dataguru",
        label: "Data Guru",
        href: "/admin/dataguru",
        icon: <FaChalkboardTeacher />,
    },
    {
        key: "datamurid",
        label: "Data Murid",
        href: "/admin/datamurid",
        icon: <PiStudent />,
    },
    {
        key: "datamatapelajaran",
        label: "Data Mata Pelajaran",
        href: "/admin/datamatapelajaran",
        icon: <FaBook />,
    },
    {
        key: "setting",
        label: "Setting",
        href: "/admin/setting",
        icon: <CiSettings />,
    },
];

const SIDEBAR_GURU = [
    {
        key: "dashboard",
        label: "Dashboard",
        href: "/guru/dashboard",
        icon: <CiGrid41 />,
    },
    {
        key: "matapelajaran",
        label: "Mata Pelajaran",
        href: "/guru/matapelajaran",
        icon: <FaBook />,
    },
    {
        key: "tugas",
        label: "Tugas",
        href: "/guru/tugas",
        icon: <BiTask />,
    },
    {
        key: "penilaian",
        label: "Penilaian",
        href: "/guru/penilaian",
        icon: <GoChecklist />,
    },
    {
        key: "setting",
        label: "Setting",
        href: "/guru/setting",
        icon: <CiSettings />,
    },
];

export { SIDEBAR_MURID, SIDEBAR_ADMIN, SIDEBAR_GURU };
