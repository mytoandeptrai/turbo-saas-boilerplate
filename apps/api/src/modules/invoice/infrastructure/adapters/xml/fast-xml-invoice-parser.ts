import { Injectable } from '@nestjs/common'
import { XMLParser, XMLValidator } from 'fast-xml-parser'

import { normalizeInvoice } from '@/modules/invoice/domain/invoice-normalizer'
import { InvoiceParseError } from '@/modules/invoice/domain/invoice-parse.error'
import { fptAdapter } from '@/modules/invoice/infrastructure/adapters/xml/fpt.adapter'
import { misaAdapter } from '@/modules/invoice/infrastructure/adapters/xml/misa.adapter'
import { tctGenericAdapter } from '@/modules/invoice/infrastructure/adapters/xml/tct-generic.adapter'
import { tctStandardAdapter } from '@/modules/invoice/infrastructure/adapters/xml/tct-standard.adapter'
import { vnptAdapter } from '@/modules/invoice/infrastructure/adapters/xml/vnpt.adapter'

import type { InvoiceXmlParser } from '@/modules/invoice/application/ports/invoice-xml-parser.port'
import type { ParsedInvoice } from '@/modules/invoice/domain/invoice.types'
import type { InvoiceXmlAdapter } from '@/modules/invoice/infrastructure/adapters/xml/invoice-xml.adapter'
import type { XmlNode } from '@/modules/invoice/infrastructure/adapters/xml/xml-node'

// Detection is structural (root element), ordered from most specific to most generic
const ADAPTERS: InvoiceXmlAdapter[] = [
  tctStandardAdapter,
  vnptAdapter,
  fptAdapter,
  misaAdapter,
  tctGenericAdapter,
]

const DTD_PATTERN = /<!(DOCTYPE|ENTITY)/i

@Injectable()
export class FastXmlInvoiceParser implements InvoiceXmlParser {
  private readonly parser = new XMLParser({
    ignoreAttributes: true,
    ignoreDeclaration: true,
    ignorePiTags: true,
    // Keep leading zeros of invoice numbers and tax codes, and exact decimals
    parseTagValue: false,
    removeNSPrefix: true,
    trimValues: true,
  })

  parse(content: Buffer): ParsedInvoice {
    const xml = content.toString('utf8').replace(/^\uFEFF/, '')

    // E-invoices never carry a DTD; rejecting it rules out XXE and entity expansion
    if (DTD_PATTERN.test(xml)) {
      throw new InvoiceParseError(
        'INVOICE_XML_MALFORMED',
        'File XML chứa khai báo DOCTYPE/ENTITY không được phép',
      )
    }

    // fast-xml-parser is lenient with truncated documents, so validate first
    if (XMLValidator.validate(xml) !== true) {
      throw new InvoiceParseError(
        'INVOICE_XML_MALFORMED',
        'File XML bị hỏng hoặc không đúng cú pháp',
      )
    }

    let document: XmlNode
    try {
      document = this.parser.parse(xml) as XmlNode
    } catch {
      throw new InvoiceParseError(
        'INVOICE_XML_MALFORMED',
        'File XML bị hỏng hoặc không đúng cú pháp',
      )
    }

    const adapter = ADAPTERS.find((candidate) => candidate.canParse(document))
    if (!adapter) {
      throw new InvoiceParseError(
        'INVOICE_UNKNOWN_FORMAT',
        'Không nhận diện được định dạng hóa đơn điện tử',
      )
    }

    return normalizeInvoice(adapter.toRaw(document))
  }
}
