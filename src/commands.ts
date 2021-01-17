import nodeThermalPrinter from 'node-thermal-printer';

export abstract class PrinterCommand {
	constructor() {}
	public abstract print(printer: nodeThermalPrinter.printer): void;
}

export abstract class ControlCommand extends PrinterCommand {}

export abstract class DataCommand extends ControlCommand {
	constructor(public data: string) {
		super();
	}
}

export class ExecuteCommand extends ControlCommand {
	public print(printer: nodeThermalPrinter.printer): void {
		printer.execute();
	}
}

export class NewLineCommand extends ControlCommand {
	public print(printer: nodeThermalPrinter.printer): void {
		printer.newLine();
	}
}

export class CutCommand extends ControlCommand {
	public print(printer: nodeThermalPrinter.printer): void {
		printer.cut();
	}
}

export class NoopCommand extends ControlCommand {
	public print(printer: nodeThermalPrinter.printer): void {}
}

export class AppendCommand extends DataCommand {
	print(printer: nodeThermalPrinter.printer) {
		printer.append(this.data);
	}
}

export class PrintLineCommand extends DataCommand {
	print(printer: nodeThermalPrinter.printer) {
		printer.println(this.data);
	}
}

export class Code128Command extends DataCommand {
	print(printer: nodeThermalPrinter.printer) {
		// will throw an error
		// printer.code128(this.data);
		printer.printBarcode(this.data);
	}
}

export class Code39Command extends DataCommand {
	print(printer: nodeThermalPrinter.printer) {
		printer.printBarcode(
			this.data,
			(Buffer.from([0x1d, 0x6b, 0x04]) as unknown) as number
		);
	}
}

export class QrCodeCommand extends DataCommand {
	print(printer: nodeThermalPrinter.printer) {
		printer.drawLine();
		printer.printQR(this.data);
		printer.print(this.data);
		printer.drawLine();
	}
}

export class Pdf417Command extends DataCommand {
	print(printer: nodeThermalPrinter.printer) {
		printer.pdf417(this.data);
	}
}

export class LinkCommand extends DataCommand {
	constructor(public linkText: string, public url: string) {
		super(url);
	}
	public print(printer: nodeThermalPrinter.printer): void {
		printer.printQR(this.url);
		printer.bold(true);
		printer.println(this.linkText);
		printer.bold(false);
		printer.println(this.url);
	}
}
export class TitleCommand extends DataCommand {
	print(printer: nodeThermalPrinter.printer) {
		printer.setTextQuadArea();
		printer.println(this.data);
		printer.setTextNormal();
	}
}

export class BoldCommand extends DataCommand {
	print(printer: nodeThermalPrinter.printer) {
		printer.bold(true);
		printer.append(this.data);
		printer.bold(false);
	}
}

export class LeftRightCommand extends DataCommand {
	constructor(public left: string, public right: string) {
		super(left);
	}

	public print(printer: nodeThermalPrinter.printer): void {
		printer.leftRight(this.left, this.right);
	}
}

export class UnderlineCommand extends DataCommand {
	print(printer: nodeThermalPrinter.printer) {
		printer.underline(true);
		printer.append(this.data);
		printer.underline(false);
	}
}

export class RuleCommand extends ControlCommand {
	constructor(public appendNewLine: boolean = false) {
		super();
	}
	print(printer: nodeThermalPrinter.printer) {
		const width = printer.getWidth();
		printer.append('-'.repeat(width));
		if (this.appendNewLine) {
			printer.newLine();
		}
	}
}

export class CenterCommand extends DataCommand {
	print(printer: nodeThermalPrinter.printer) {
		printer.alignCenter();
		printer.println(this.data);
		printer.alignLeft();
	}
}
