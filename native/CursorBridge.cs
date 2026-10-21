using System;
using System.Collections.Concurrent;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

namespace Porcelain {
    // Raw Input measures relative hardware motion even while ClipCursor really
    // confines the system cursor to one physical pixel. No simulated cursor.
    public sealed class CursorBridge : NativeWindow {
        [StructLayout(LayoutKind.Sequential)] struct Point { public int X, Y; }
        [StructLayout(LayoutKind.Sequential)] struct Rect { public int Left, Top, Right, Bottom; }
        [StructLayout(LayoutKind.Sequential)] struct Device { public ushort Page, Usage; public uint Flags; public IntPtr Target; }
        [StructLayout(LayoutKind.Sequential)] struct Header { public uint Type, Size; public IntPtr Device, WParam; }
        [DllImport("user32.dll")] static extern bool RegisterRawInputDevices(Device[] devices, uint count, uint size);
        [DllImport("user32.dll")] static extern uint GetRawInputData(IntPtr input, uint command, IntPtr data, ref uint size, uint headerSize);
        [DllImport("user32.dll")] static extern bool GetCursorPos(out Point p);
        [DllImport("user32.dll")] static extern bool SetCursorPos(int x, int y);
        [DllImport("user32.dll", EntryPoint="ClipCursor")] static extern bool Clip(ref Rect r);
        [DllImport("user32.dll", EntryPoint="ClipCursor")] static extern bool Unclip(IntPtr p);
        [DllImport("user32.dll")] static extern bool SetProcessDPIAware();
        readonly ConcurrentQueue<string> commands = new ConcurrentQueue<string>();
        bool locked;
        Point anchor;
        readonly IntPtr buffer = Marshal.AllocHGlobal(256);
        CursorBridge() {
            CreateHandle(new CreateParams { Caption = "Porcelain Raw Input", Parent = new IntPtr(-3) });
            Device device = new Device { Page = 1, Usage = 2, Flags = 0x100, Target = Handle };
            if (!RegisterRawInputDevices(new Device[] { device }, 1, (uint)Marshal.SizeOf(typeof(Device)))) throw new Exception("Raw Input registration failed.");
        }
        protected override void WndProc(ref Message message) {
            if (message.Msg == 0x00FF && locked) {
                uint size = 256;
                uint header = (uint)Marshal.SizeOf(typeof(Header));
                uint result = GetRawInputData(message.LParam, 0x10000003, buffer, ref size, header);
                if (result != uint.MaxValue && size <= 256 && Marshal.ReadInt32(buffer) == 0) {
                    int x = Marshal.ReadInt32(buffer, (int)header + 12);
                    int y = Marshal.ReadInt32(buffer, (int)header + 16);
                    if (x != 0 || y != 0) Console.WriteLine("move " + x + " " + y);
                }
            }
            base.WndProc(ref message);
        }
        void Unlock() { locked = false; Unclip(IntPtr.Zero); SetCursorPos(anchor.X, anchor.Y); }
        void Process(string command) {
            string[] parts = command.Split(' ');
            if (parts[0] == "lock" && parts.Length == 4) {
                Unclip(IntPtr.Zero);
                GetCursorPos(out anchor);
                if (parts[1] == "center") { anchor.X = int.Parse(parts[2]); anchor.Y = int.Parse(parts[3]); SetCursorPos(anchor.X, anchor.Y); }
                Rect rect = new Rect { Left = anchor.X, Top = anchor.Y, Right = anchor.X + 1, Bottom = anchor.Y + 1 };
                Clip(ref rect); locked = true;
            } else if (parts[0] == "unlock") {
                if (locked) Unlock();
            } else if (parts[0] == "quit") { if (locked) Unlock(); Application.ExitThread(); }
        }
        public static void Run() {
            SetProcessDPIAware();
            using (BridgeLifetime lifetime = new BridgeLifetime()) { lifetime.Start(); }
        }
        sealed class BridgeLifetime : IDisposable {
            CursorBridge bridge = new CursorBridge();
            public void Start() {
                Thread reader = new Thread(delegate() {
                    string line;
                    while ((line = Console.ReadLine()) != null) bridge.commands.Enqueue(line);
                    bridge.commands.Enqueue("quit");
                });
                reader.IsBackground = true; reader.Start();
                System.Windows.Forms.Timer timer = new System.Windows.Forms.Timer { Interval = 8 };
                timer.Tick += delegate { string line; while (bridge.commands.TryDequeue(out line)) bridge.Process(line); };
                timer.Start(); Console.WriteLine("ready"); Application.Run(); timer.Dispose();
            }
            public void Dispose() { if (bridge.locked) bridge.Unlock(); Marshal.FreeHGlobal(bridge.buffer); bridge.DestroyHandle(); }
        }
    }
}
