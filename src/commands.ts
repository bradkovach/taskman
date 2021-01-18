import { printer } from 'node-thermal-printer';

export abstract class PrinterCommand {
	constructor() {}
	public abstract print(printer: printer): void;
}

export abstract class ControlCommand extends PrinterCommand {
	public abstract toString(): string;
}

export abstract class DataCommand extends ControlCommand {
	constructor(public data: string) {
		super();
	}
}

export class NewLineCommand extends ControlCommand {
	toString() {
		return '\n';
	}
	public print(printer: printer): void {
		printer.newLine();
	}
}

export class CutCommand extends ControlCommand {
	public toString(): string {
		return '';
	}
	public print(printer: printer): void {
		printer.cut();
	}
}

export class NoopCommand extends ControlCommand {
	public toString(): string {
		return '';
	}
	public print(printer: printer): void {}
}

export class AppendCommand extends DataCommand {
	public toString(): string {
		return this.data;
	}
	print(printer: printer) {
		printer.append(this.data);
	}
}

export class PrintLineCommand extends DataCommand {
	public toString(): string {
		return this.data + '\n';
	}
	print(printer: printer) {
		printer.println(this.data);
	}
}

export class Code128Command extends DataCommand {
	public toString(): string {
		return `||128:${this.data}||`;
	}
	print(printer: printer) {
		// will throw an error
		// printer.code128(this.data);
		printer.printBarcode(this.data);
	}
}

export class Code39Command extends DataCommand {
	public toString(): string {
		return `||39:${this.data}||`;
	}
	print(printer: printer) {
		printer.printBarcode(
			this.data,
			(Buffer.from([0x1d, 0x6b, 0x04]) as unknown) as number
		);
	}
}

export class QrCodeCommand extends DataCommand {
	public toString(): string {
		const rule = '-'.repeat(41);
		return [
			rule,
			`||qr:${this.data}||`,
			this.data,
			rule,
			'',
		].join('\n');
	}

	print(printer: printer) {
		printer.drawLine();
		printer.printQR(this.data);
		printer.println(this.data);
		printer.drawLine();
	}
}

export class Pdf417Command extends DataCommand {
	public toString(): string {
		const rule = '-'.repeat(41);
		return [rule, `||417:${this.data}||`, rule, ''].join('\n');
	}
	print(printer: printer) {
		printer.pdf417(this.data);
	}
}

export class LinkCommand extends DataCommand {
	public toString(): string {
		return `[${this.linkText}](${this.url})`;
	}
	constructor(public linkText: string, public url: string) {
		super(url);
	}
	public print(printer: printer): void {
		printer.printQR(this.url);
		printer.bold(true);
		printer.println(this.linkText);
		printer.bold(false);
		printer.println(this.url);
	}
}
export class TitleCommand extends DataCommand {
	public toString(): string {
		return `# ${this.data}`;
	}
	print(printer: printer) {
		printer.setTextQuadArea();
		printer.println(this.data);
		printer.setTextNormal();
	}
}

export class BoldCommand extends DataCommand {
	public toString(): string {
		return `**${this.data}**`;
	}
	print(printer: printer) {
		printer.bold(true);
		printer.append(this.data);
		printer.bold(false);
	}
}

export class LeftRightCommand extends DataCommand {
	public toString(): string {
		const leftLength = this.left.length,
			rightLength = this.right.length,
			padLength = 41 - leftLength - rightLength;

		return [
			this.left,
			' '.repeat(padLength),
			this.right,
			'\n',
		].join('');
	}
	constructor(public left: string, public right: string) {
		super(left);
	}

	public print(printer: printer): void {
		printer.leftRight(this.left, this.right);
	}
}

export class UnderlineCommand extends DataCommand {
	public toString(): string {
		return `__${this.data}__`;
	}
	print(printer: printer) {
		printer.underline(true);
		printer.append(this.data);
		printer.underline(false);
	}
}

export class RuleCommand extends ControlCommand {
	toString(): string {
		// prettier-ignore
		return [
			'-'.repeat(41), 
			this.appendNewLine ? '\n' : ''
		].join('');
	}

	constructor(public appendNewLine: boolean = false) {
		super();
	}

	print(printer: printer) {
		const width = printer.getWidth();
		printer.append('-'.repeat(width));
		if (this.appendNewLine) {
			printer.newLine();
		}
	}
}

export class CenterCommand extends DataCommand {
	public toString(): string {
		const leftDelimiter = ':-- ',
			rightDelimiter = leftDelimiter
				.split('')
				.reverse()
				.join('');
		return [leftDelimiter, this.data, rightDelimiter, '\n'].join(
			''
		);
	}
	print(printer: printer) {
		printer.alignCenter();
		printer.println(this.data);
		printer.alignLeft();
	}
}
