const fs = require('fs');
const path = require('path');

// MAPPING DICTIONARY
// Lucide -> Heroicons (24/outline)
const ICON_MAP = {
    // Common
    'Loader2': 'ArrowPathIcon',
    'CheckCircle2': 'CheckCircleIcon',
    'XCircle': 'XCircleIcon',
    'AlertTriangle': 'ExclamationTriangleIcon',
    'Settings': 'Cog6ToothIcon',
    'ChevronRight': 'ChevronRightIcon',
    'ChevronLeft': 'ChevronLeftIcon',
    'ChevronsLeft': 'ChevronDoubleLeftIcon',
    'ChevronsRight': 'ChevronDoubleRightIcon',
    'ChevronDown': 'ChevronDownIcon',
    'ChevronUp': 'ChevronUpIcon',
    'ChevronsUpDown': 'ChevronUpDownIcon',
    'Calendar': 'CalendarIcon', // Handle explicit Calendar vs CalendarIcon conflict
    'CalendarIcon': 'CalendarIcon',
    'Search': 'MagnifyingGlassIcon',
    'Check': 'CheckIcon',
    'X': 'XMarkIcon',
    'Plus': 'PlusIcon',
    'Trash2': 'TrashIcon',
    'ArrowRight': 'ArrowRightIcon',
    'ArrowLeft': 'ArrowLeftIcon',
    'UserPlus': 'UserPlusIcon',
    'Info': 'InformationCircleIcon',
    'MoreHorizontal': 'EllipsisHorizontalIcon',
    'MoreVertical': 'EllipsisVerticalIcon',
    'Eye': 'EyeIcon',
    'Download': 'ArrowDownTrayIcon',
    'Upload': 'ArrowUpTrayIcon',
    'Copy': 'ClipboardIcon',
    'Filter': 'FunnelIcon',
    'FilterX': 'FunnelIcon', // Approximation
    'FileText': 'DocumentTextIcon',
    'Briefcase': 'BriefcaseIcon',
    'Mail': 'EnvelopeIcon',
    'Phone': 'PhoneIcon',
    'MapPin': 'MapPinIcon',
    'Link': 'LinkIcon',
    'Globe': 'GlobeAltIcon',
    'ShieldAlert': 'ShieldExclamationIcon',
    'BadgeCheck': 'BadgeCheckIcon',
    'Clock': 'ClockIcon',
    'ExternalLink': 'ArrowTopRightOnSquareIcon',
    'RefreshCw': 'ArrowPathIcon',
    'Zap': 'BoltIcon',
    'Sliders': 'AdjustmentsHorizontalIcon',
    'Menu': 'Bars3Icon',
    'GripVertical': 'QueueListIcon', // Approximation? Or maybe Bars2?
    'GripHorizontal': 'Bars2Icon',
    'FileUp': 'DocumentArrowUpIcon',
    'FileDown': 'DocumentArrowDownIcon',
    'FilePlus': 'DocumentPlusIcon',
    'FileMinus': 'DocumentMinusIcon',
    'FileEdit': 'PencilSquareIcon', // Edit on document
    'FileSearch': 'DocumentMagnifyingGlassIcon',
    'FileCode': 'CommandLineIcon', // Approximation
    'FileX': 'DocumentIcon', // Approximation
    'Code2': 'CodeBracketIcon',
    'LogIn': 'ArrowRightOnRectangleIcon',
    'Layout': 'RectangleGroupIcon',
    'Bell': 'BellIcon',
    'Monitor': 'ComputerDesktopIcon',
    'Smartphone': 'DevicePhoneMobileIcon',
    'KeyRound': 'KeyIcon',
    'Activity': 'ChartBarIcon', // or Pulse? Sparkles? using ChartBar as generic activity
    'SlidersHorizontal': 'AdjustmentsHorizontalIcon',
    'Lightbulb': 'LightBulbIcon',
    'Play': 'PlayIcon',
    'HardDrive': 'ServerIcon',
    'Type': 'LanguageIcon', // text type?
    'List': 'ListBulletIcon',
    'UserCircle': 'UserCircleIcon',
    'Home': 'HomeIcon',
    'Key': 'KeyIcon',
    'ImageUp': 'PhotoIcon', // upload photo
    'PenSquare': 'PencilSquareIcon',
    'Sun': 'SunIcon',
    'Moon': 'MoonIcon',
    'Sidebar': 'RectangleGroupIcon', // sidebar layout
    'Bug': 'BugAntIcon',
    'Hash': 'HashtagIcon',
    'AlertOctagon': 'ExclamationCircleIcon', // octagon -> circle exclamation
    'TrendingDown': 'ArrowTrendingDownIcon',
    'TrendingUp': 'ArrowTrendingUpIcon',
    'Send': 'PaperAirplaneIcon',
    'BookOpen': 'BookOpenIcon',
    'Code': 'CodeBracketIcon',
    'Award': 'TrophyIcon',
    'Trophy': 'TrophyIcon',
    'UserCog': 'UserCircleIcon', // user settings -> user circle or similar
    'UserEdit': 'PencilSquareIcon', // user edit
    'UserSearch': 'UserIcon', // search user
    'UserList': 'UserGroupIcon',
    'UserCheck2': 'UserPlusIcon',
    'UserClock': 'UserIcon',
    'UserStar': 'StarIcon',
    'UserAward': 'UserIcon',
    'UserTrophy': 'UserIcon',
    'UserTarget': 'UserIcon',
    'UserTrendingUp': 'UserIcon',
    'UserTrendingDown': 'UserIcon',
    'UserActivity': 'UserIcon',
    'UserHeart': 'UserIcon',
    'UserSmile': 'UserIcon',
    'UserFrown': 'UserIcon',
    'UserMeh': 'UserIcon',
    'UserX2': 'UserMinusIcon',
    'UserCheck3': 'UserPlusIcon',
    'UserClock2': 'UserIcon',
    'UserStar2': 'StarIcon',
    'UserAward2': 'UserIcon',
    'UserTrophy2': 'UserIcon',
    'UserTarget2': 'UserIcon',
    'UserTrendingUp2': 'UserIcon',
    'UserTrendingDown2': 'UserIcon',
    'UserActivity2': 'UserIcon',
    'UserHeart2': 'UserIcon',
    'UserSmile2': 'UserIcon',
    'UserFrown2': 'UserIcon',
    'UserMeh2': 'UserIcon',
    'ListFilter': 'FunnelIcon',
    'CheckSquare': 'check-circle', // Wait, CheckSquare is usually a checkbox. Using CheckCircleIcon or similar
    'Square': 'StopIcon',
    'Pencil': 'PencilIcon',
    'MoveRight': 'ArrowRightIcon',
    'PinOff': 'MapPinIcon', // approximation
    'DollarSign': 'CurrencyDollarIcon',
    'CalendarDays': 'CalendarDaysIcon',
    'Maximize2': 'ArrowsPointingOutIcon',
    'Edit2': 'PencilIcon',
    'File': 'DocumentIcon',
    'Package2': 'CubeIcon',
    'Shield': 'ShieldCheckIcon',
    'LayoutGrid': 'Squares2x2Icon',
    'Wifi': 'WifiIcon',
    'Circle': 'StopIcon', // Circle shape
    'ListTodo': 'ClipboardDocumentListIcon',
    'BarChart3': 'ChartBarIcon',
    'Upload': 'ArrowUpTrayIcon',
    'ListOrdered': 'ListBulletIcon',
    'ServerCrash': 'ExclamationCircleIcon',
    'RefreshCw': 'ArrowPathIcon',
    'Settings2': 'Cog6ToothIcon',
    'KanbanSquare': 'ViewColumnsIcon',
    'PlusCircle': 'PlusCircleIcon',
    'Edit3': 'PencilSquareIcon',
    'Image': 'PhotoIcon',
    'ImageIcon': 'PhotoIcon',
    'AlertCircle': 'ExclamationCircleIcon',
    'Users': 'UsersIcon',
    'User': 'UserIcon',
    'Building': 'BuildingOfficeIcon',
    'Landmark': 'BuildingLibraryIcon',
    'Building2': 'BuildingOffice2Icon',
    'ScanLine': 'QrCodeIcon',
    'Scan': 'QrCodeIcon',
    'QrCode': 'QrCodeIcon',
    'PhoneCall': 'PhoneIcon',
    'MailOpen': 'EnvelopeOpenIcon',
    'MessageSquare': 'ChatBubbleLeftIcon',
    'MessageCircle': 'ChatBubbleOvalLeftIcon',
    'SendHorizonal': 'PaperAirplaneIcon',
    'HelpingHand': 'HandRaisedIcon',
    'ThumbsUp': 'HandThumbUpIcon',
    'ThumbsDown': 'HandThumbDownIcon',
    'Timer': 'ClockIcon',
    'Watch': 'ClockIcon',
    'History': 'ClockIcon',
    'MousePointer2': 'CursorArrowRaysIcon',
    'Pointer': 'CursorArrowRaysIcon',
    'Ban': 'NoSymbolIcon',
    'Lock': 'LockClosedIcon',
    'Unlock': 'LockOpenIcon',
    'EyeOff': 'EyeSlashIcon',
    'DownloadCloud': 'CloudArrowDownIcon',
    'UploadCloud': 'CloudArrowUpIcon',
    'RotateCcw': 'ArrowPathIcon',
    'RotateCw': 'ArrowPathIcon',
    'RefreshCcw': 'ArrowPathIcon',
    'Hammer': 'WrenchScrewdriverIcon',
    'Construction': 'WrenchScrewdriverIcon',
    'Wrench': 'WrenchIcon',
    'SearchX': 'MagnifyingGlassMinusIcon',
    'SearchCheck': 'MagnifyingGlassPlusIcon',
    'Folder': 'FolderIcon',
    'FolderOpen': 'FolderOpenIcon',
    'FolderPlus': 'FolderPlusIcon',
    'FolderMinus': 'FolderMinusIcon',
    'FileStack': 'DocumentDuplicateIcon',
    'MoveVertical': 'ArrowsUpDownIcon',
    'Target': 'FlagIcon', // Using Flag for Goal/Target
    'Save': 'ArrowDownOnSquareIcon', // Using Download/Save icon
    'UserX': 'UserMinusIcon',
    'CircuitBoard': 'CpuChipIcon',
    'Kanban': 'ViewColumnsIcon',
    'ClipboardCheck': 'ClipboardDocumentCheckIcon',
    'CheckCircle': 'CheckCircleIcon',
    'LayoutList': 'ListBulletIcon',
    'Tag': 'TagIcon',
    'UserCheck': 'UserPlusIcon',
    'Pin': 'MapPinIcon',
    'Edit': 'PencilSquareIcon',
    'Paperclip': 'PaperClipIcon',
    'FileSpreadsheet': 'TableCellsIcon',
    // Add specialized overrides for overlapping names or nuanced icons
};

// Function to recursively find files
function walk(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
                walk(filePath, fileList);
            }
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                fileList.push(filePath);
            }
        }
    });
    return fileList;
}

const srcDir = path.join(process.cwd(), 'src');
const files = walk(srcDir);

let totalSubstitutions = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    const originalContent = content;

    // 1. Find imports from "lucide-react"
    const importRegex = /import\s+{([^}]+)}\s+from\s+['"]lucide-react['"]/g;
    let match;
    let importStatementFound = false;
    let lucideImports = [];

    // We need to capture the exact import string to replace it later
    let fullImportString = '';

    while ((match = importRegex.exec(content)) !== null) {
        importStatementFound = true;
        fullImportString = match[0];
        const imports = match[1].split(',').map(s => s.trim()).filter(s => s);
        lucideImports.push(...imports);
    }

    if (!importStatementFound) return;

    // 2. Map imports to replacements
    const replacements = [];
    const heroImports = new Set();
    const unknownIcons = [];

    lucideImports.forEach(imp => {
        // Handle aliases: "Icon as Alias"
        let name = imp;
        let alias = null;
        if (imp.includes(' as ')) {
            [name, alias] = imp.split(' as ').map(s => s.trim());
        }

        const heroName = ICON_MAP[name];
        if (heroName) {
            replacements.push({
                old: alias || name, // Use alias if present for JSX replacement
                new: heroName,
                isAlias: !!alias
            });
            heroImports.add(heroName);
        } else {
            unknownIcons.push(name);
        }
    });

    if (unknownIcons.length > 0) {
        console.warn(`[WARN] Skipping ${file} due to unknown icons: ${unknownIcons.join(', ')}`);
        // Use what we can? No, safer to skip or partially migrate. 
        // Let's migrate what we know and leave the unknown ones? 
        // Actually, if we remove the lucide import, the unknown ones will break.
        // STRATEGY: Only remove mapped icons from lucide import. If lucide import becomes empty, remove line.
    }

    // 3. Perform Replacements in Content
    // Replace JSX usages first: <Icon ... /> or <Icon className... />
    // Also handle just the name usage in code (like in arrays)

    replacements.forEach(rep => {
        // Precise regex for JSX tag or Identifier boundary
        // match <OldName or OldName followed by non-identifier char
        const regex = new RegExp(`\\b${rep.old}\\b`, 'g');
        content = content.replace(regex, rep.new);
    });

    // 4. Update Imports
    // Parse existing Heroicons import if present
    const heroImportRegex = /import\s+{([^}]+)}\s+from\s+['"]@heroicons\/react\/24\/outline['"]/;
    const heroMatch = heroImportRegex.exec(content);

    let currentHeroImports = new Set();
    if (heroMatch) {
        heroMatch[1].split(',').map(s => s.trim()).filter(s => s).forEach(s => currentHeroImports.add(s));
    }

    // Add new imports
    heroImports.forEach(i => currentHeroImports.add(i));

    // Reconstruction
    // Remove old Lucide tokens from the lucide import
    // If we have unknown tokens, keep them.
    const remainingLucide = unknownIcons; // These are the original names

    if (remainingLucide.length === 0) {
        // Remove entire Lucide line
        content = content.replace(importRegex, '');
        // Clean up empty lines left behind? 
        // content = content.replace(/^\s*[\r\n]/gm, ''); // risky
    } else {
        // Rewrap remaining
        const newLucideImport = `import { ${remainingLucide.join(', ')} } from "lucide-react"`;
        content = content.replace(importRegex, newLucideImport);
    }

    // Inject or Update Heroicons import
    const newHeroImportString = `import { ${Array.from(currentHeroImports).join(', ')} } from "@heroicons/react/24/outline";`;

    if (heroMatch) {
        content = content.replace(heroImportRegex, newHeroImportString);
    } else {
        // Insert after imports... or at top?
        // Find "use client" or first import
        if (content.includes('import ')) {
            content = content.replace(/import .*/, (match) => `${newHeroImportString}\n${match}`);
        } else {
            content = `${newHeroImportString}\n${content}`;
        }
    }

    // Write file if changed
    if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`[UserId: ${file}] Migrated ${replacements.length} icons.`);
        totalSubstitutions += replacements.length;
    }
});

console.log(`Migration Complete. Total substitutions: ${totalSubstitutions}`);
